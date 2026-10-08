using InvoiceGenerator.Pdf;
using Microsoft.Extensions.Logging;
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
/// - Idempotent: only invoices in Requested or Generating are processed (Generating = a previous attempt crashed).
/// - Data problems fail the invoice immediately; retrying cannot fix them.
/// - Other errors are rethrown so Service Bus retries; on the last attempt the invoice is marked Failed first.
/// </summary>
public sealed class InvoiceProcessor(
    IInvoiceRepository repository,
    IInvoiceRenderer renderer,
    TimeProvider timeProvider,
    ILogger<InvoiceProcessor> logger)
{
    private const string Source = "InvoiceGenerator";
    internal const string TechnicalFailureMessage =
        "Nie udało się wygenerować dokumentu. Szczegóły w dzienniku aplikacji (Application Log).";

    public async Task<ProcessingOutcome> ProcessAsync(
        Guid invoiceId, string correlationId, bool isLastAttempt, CancellationToken cancellationToken)
    {
        var invoice = await repository.GetInvoiceAsync(invoiceId, cancellationToken);
        if (invoice is null)
        {
            logger.LogWarning("Invoice {InvoiceId} does not exist; message ignored.", invoiceId);
            return ProcessingOutcome.Skipped;
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

            logger.LogInformation("Invoice {InvoiceNumber} generated ({Bytes} bytes).", document.Number, pdf.Length);
            return ProcessingOutcome.Generated;
        }
        catch (InvoiceValidationException ex)
        {
            await repository.MarkFailedAsync(invoiceId, ex.Message, cancellationToken);
            await TryWriteLogAsync(invoiceId, correlationId, LogSeverity.Warning, ex.Message, details: null, cancellationToken);
            logger.LogWarning("Invoice {InvoiceId} failed validation: {Reason}", invoiceId, ex.Message);
            return ProcessingOutcome.Failed;
        }
        catch (Exception ex) when (isLastAttempt && ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Invoice {InvoiceId} failed on the last delivery attempt.", invoiceId);
            await repository.MarkFailedAsync(invoiceId, TechnicalFailureMessage, cancellationToken);
            await TryWriteLogAsync(invoiceId, correlationId, LogSeverity.Error, ex.Message, ex.ToString(), cancellationToken);
            throw; // the message goes to the dead-letter queue
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
