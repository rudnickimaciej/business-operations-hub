using InvoiceGenerator.Pdf;
using Microsoft.Extensions.Logging;
using RentMaszyny.Dataverse.Common.Notifications;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Invoices;

public enum ProcessingOutcome
{
    Generated,
    Skipped,
    Failed,
}

/// <summary>
/// Generates the PDF for one invoice request.
/// - Idempotent: only invoices in Requested or Generating are processed (Generating = a previous attempt crashed);
///   Generated and Failed are skipped. An invoice without a status is bad data and is marked Failed.
/// - Data problems fail the invoice immediately; retrying cannot fix them.
/// - Other errors are rethrown so Service Bus retries; on the last attempt the invoice is marked Failed first.
/// - The invoice owner gets an in-app notification when the PDF is ready or the invoice is marked Failed.
///   Notifications are best effort: a failed notification never changes the outcome.
/// </summary>
public sealed class InvoiceProcessor(
    IInvoiceRepository repository,
    IInvoiceRenderer renderer,
    IAsyncAppNotificationSender notifications,
    TimeProvider timeProvider,
    ILogger<InvoiceProcessor> logger)
{
    private const string Source = "InvoiceGenerator";
    internal const string TechnicalFailureMessage =
        "Nie udało się wygenerować dokumentu. Szczegóły w dzienniku aplikacji (Application Log).";
    internal const string MissingStatusMessage =
        "Faktura nie ma statusu dokumentu. Ustaw status „Zlecona” i zmień datę zlecenia, aby wygenerować PDF.";
    internal const string GeneratedTitle = "Faktura {0} jest gotowa";
    internal const string GeneratedBody = "PDF faktury został wygenerowany i dołączony do faktury.";
    internal const string FailedTitle = "Nie udało się wygenerować faktury {0}";
    internal const string OpenInvoiceAction = "Otwórz fakturę";

    public async Task<ProcessingOutcome> ProcessAsync(
        Guid invoiceId, string correlationId, bool isLastAttempt, CancellationToken cancellationToken)
    {
        var invoice = await repository.GetInvoiceAsync(invoiceId, cancellationToken);
        if (invoice is null)
        {
            logger.LogWarning("Invoice {InvoiceId} does not exist; message ignored.", invoiceId);
            return ProcessingOutcome.Skipped;
        }

        // No status is bad data, not a duplicate message: tell the user on the invoice instead of skipping silently.
        if (invoice.Status is null)
        {
            await repository.MarkFailedAsync(invoiceId, MissingStatusMessage, cancellationToken);
            await TryWriteLogAsync(invoiceId, correlationId, LogSeverity.Warning, MissingStatusMessage, details: null, cancellationToken);
            await TryNotifyFailedAsync(invoice, MissingStatusMessage, cancellationToken);
            logger.LogWarning("Invoice {InvoiceId} has no document status; marked failed.", invoiceId);
            return ProcessingOutcome.Failed;
        }

        if (invoice.Status is not (InvoiceDocumentStatus.Requested or InvoiceDocumentStatus.Generating))
        {
            logger.LogInformation("Invoice {InvoiceId} has status {Status}; nothing to do.", invoiceId, invoice.Status);
            return ProcessingOutcome.Skipped;
        }

        await repository.SetStatusAsync(invoiceId, InvoiceDocumentStatus.Generating, cancellationToken);

        try
        {
            if (invoice.OrderId is null)
            {
                throw new InvoiceValidationException("Faktura nie jest powiązana z zamówieniem.");
            }

            var lines = await repository.GetOrderLinesAsync(invoice.OrderId.Value, cancellationToken);
            var seller = await repository.GetSellerAsync(cancellationToken);
            var document = InvoiceDocumentBuilder.Build(invoice, lines, seller);

            var pdf = renderer.Render(document);
            await repository.UploadDocumentAsync(invoiceId, $"{document.Number}.pdf", pdf, cancellationToken);
            await repository.MarkGeneratedAsync(invoiceId, timeProvider.GetUtcNow(), cancellationToken);
            await TryNotifyAsync(invoice, string.Format(GeneratedTitle, document.Number), GeneratedBody, isFailure: false, cancellationToken);

            logger.LogInformation("Invoice {InvoiceNumber} generated ({Bytes} bytes).", document.Number, pdf.Length);
            return ProcessingOutcome.Generated;
        }
        catch (InvoiceValidationException ex)
        {
            await repository.MarkFailedAsync(invoiceId, ex.Message, cancellationToken);
            await TryWriteLogAsync(invoiceId, correlationId, LogSeverity.Warning, ex.Message, details: null, cancellationToken);
            await TryNotifyFailedAsync(invoice, ex.Message, cancellationToken);
            logger.LogWarning("Invoice {InvoiceId} failed validation: {Reason}", invoiceId, ex.Message);
            return ProcessingOutcome.Failed;
        }
        catch (Exception ex) when (isLastAttempt && ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Invoice {InvoiceId} failed on the last delivery attempt.", invoiceId);
            await repository.MarkFailedAsync(invoiceId, TechnicalFailureMessage, cancellationToken);
            await TryWriteLogAsync(invoiceId, correlationId, LogSeverity.Error, ex.Message, ex.ToString(), cancellationToken);
            await TryNotifyFailedAsync(invoice, TechnicalFailureMessage, cancellationToken);
            throw; // the message goes to the dead-letter queue
        }
    }

    private Task TryNotifyFailedAsync(InvoiceRecord invoice, string reason, CancellationToken cancellationToken) =>
        TryNotifyAsync(invoice, string.Format(FailedTitle, invoice.Number), reason, isFailure: true, cancellationToken);

    // The PDF and the status are already saved; a notification problem only goes to the function log.
    private async Task TryNotifyAsync(
        InvoiceRecord invoice, string title, string body, bool isFailure, CancellationToken cancellationToken)
    {
        if (invoice.OwnerUserId is not { } recipient)
        {
            return; // owned by a team: app notifications go to users only
        }

        var builder = AppNotificationBuilder.To(recipient)
            .WithTitle(title)
            .WithBody(body)
            .WithOpenRecordAction(OpenInvoiceAction, cr679_invoice.EntityLogicalName, invoice.Id);

        try
        {
            await notifications.SendAsync((isFailure ? builder.AsFailure() : builder.AsSuccess()).Build(), cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not notify the owner of invoice {InvoiceId}.", invoice.Id);
        }
    }

    // Logging must never hide the original problem.
    private async Task TryWriteLogAsync(
        Guid invoiceId, string correlationId, LogSeverity severity, string message, string? details,
        CancellationToken cancellationToken)
    {
        try
        {
            await repository.WriteLogAsync(
                new ApplicationLogEntry(
                    Name: $"{Source}: {severity}",
                    Severity: severity,
                    CorrelationId: correlationId,
                    Operation: "GenerateInvoicePdf",
                    Message: message,
                    Details: details,
                    RecordId: invoiceId),
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Could not write to cr679_applicationlog for invoice {InvoiceId}.", invoiceId);
        }
    }
}
