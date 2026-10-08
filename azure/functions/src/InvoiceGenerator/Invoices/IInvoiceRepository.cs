using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Invoices;

/// <summary>Dataverse access needed by the generator. Implemented by DataverseInvoiceRepository; faked in tests.</summary>
public interface IInvoiceRepository
{
    Task<InvoiceRecord?> GetInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken);

    Task<IReadOnlyList<InvoiceLine>> GetOrderLinesAsync(Guid orderId, CancellationToken cancellationToken);

    Task<Seller> GetSellerAsync(CancellationToken cancellationToken);

    Task SetStatusAsync(Guid invoiceId, InvoiceDocumentStatus status, CancellationToken cancellationToken);

    Task UploadDocumentAsync(Guid invoiceId, string fileName, byte[] content, CancellationToken cancellationToken);

    Task MarkGeneratedAsync(Guid invoiceId, DateTimeOffset generatedOn, CancellationToken cancellationToken);

    Task MarkFailedAsync(Guid invoiceId, string userMessage, CancellationToken cancellationToken);

    Task WriteLogAsync(ApplicationLogEntry entry, CancellationToken cancellationToken);
}

/// <summary>A row for cr679_applicationlog.</summary>
public sealed record ApplicationLogEntry(
    string Name,
    LogSeverity Severity,
    string CorrelationId,
    string Operation,
    string Message,
    string? Details,
    Guid RecordId);
