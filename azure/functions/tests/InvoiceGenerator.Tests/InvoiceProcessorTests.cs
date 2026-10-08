using InvoiceGenerator.Invoices;
using InvoiceGenerator.Pdf;
using Microsoft.Extensions.Logging.Abstractions;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Tests;

public class InvoiceProcessorTests
{
    private readonly FakeRepository repository = new();
    private readonly FakeRenderer renderer = new();

    private InvoiceProcessor Processor() =>
        new(repository, renderer, TimeProvider.System, NullLogger<InvoiceProcessor>.Instance);

    private Task<ProcessingOutcome> Process(bool isLastAttempt = false) =>
        Processor().ProcessAsync(TestData.InvoiceId, "corr-1", isLastAttempt, CancellationToken.None);

    [Fact]
    public async Task Generates_uploads_and_marks_the_invoice_generated()
    {
        Assert.Equal(ProcessingOutcome.Generated, await Process());

        Assert.Equal([InvoiceDocumentStatus.Generating, InvoiceDocumentStatus.Generated], repository.Statuses);
        Assert.Equal("FV-01000.pdf", repository.UploadedFileName);
        Assert.Empty(repository.Logs);
    }

    [Theory]
    [InlineData(InvoiceDocumentStatus.Generated)]
    [InlineData(InvoiceDocumentStatus.Failed)]
    public async Task Skips_invoices_that_are_not_waiting_for_generation(InvoiceDocumentStatus status)
    {
        repository.Invoice = TestData.Invoice(status);

        Assert.Equal(ProcessingOutcome.Skipped, await Process());
        Assert.Empty(repository.Statuses);
        Assert.Null(repository.UploadedFileName);
    }

    [Fact]
    public async Task Continues_an_invoice_left_in_generating_by_a_crashed_attempt()
    {
        repository.Invoice = TestData.Invoice(InvoiceDocumentStatus.Generating);

        Assert.Equal(ProcessingOutcome.Generated, await Process());
    }

    [Fact]
    public async Task Skips_a_deleted_invoice()
    {
        repository.Invoice = null;

        Assert.Equal(ProcessingOutcome.Skipped, await Process());
    }

    [Fact]
    public async Task Fails_immediately_on_invalid_data_without_retrying()
    {
        repository.Lines = [];

        Assert.Equal(ProcessingOutcome.Failed, await Process());

        Assert.Equal(InvoiceDocumentStatus.Failed, repository.Statuses[^1]);
        Assert.Contains("pozycji", repository.FailureMessage);
        Assert.Equal(LogSeverity.Warning, Assert.Single(repository.Logs).Severity);
    }

    [Fact]
    public async Task Rethrows_a_technical_error_for_retry_and_leaves_the_invoice_generating()
    {
        renderer.Error = new TimeoutException("Dataverse timeout");

        await Assert.ThrowsAsync<TimeoutException>(() => Process(isLastAttempt: false));

        Assert.Equal([InvoiceDocumentStatus.Generating], repository.Statuses);
        Assert.Empty(repository.Logs);
    }

    [Fact]
    public async Task Marks_the_invoice_failed_and_logs_on_the_last_attempt()
    {
        renderer.Error = new TimeoutException("Dataverse timeout");

        await Assert.ThrowsAsync<TimeoutException>(() => Process(isLastAttempt: true));

        Assert.Equal(InvoiceDocumentStatus.Failed, repository.Statuses[^1]);
        Assert.Equal(InvoiceProcessor.TechnicalFailureMessage, repository.FailureMessage);
        var log = Assert.Single(repository.Logs);
        Assert.Equal(LogSeverity.Error, log.Severity);
        Assert.Equal("corr-1", log.CorrelationId);
    }

    [Fact]
    public async Task A_failing_application_log_does_not_hide_the_original_error()
    {
        renderer.Error = new TimeoutException("Dataverse timeout");
        repository.LogError = new InvalidOperationException("log table unavailable");

        await Assert.ThrowsAsync<TimeoutException>(() => Process(isLastAttempt: true));
    }

    private sealed class FakeRenderer : IInvoiceRenderer
    {
        public Exception? Error { get; set; }

        public byte[] Render(InvoiceDocument invoice) => Error is null ? "%PDF-fake"u8.ToArray() : throw Error;
    }

    private sealed class FakeRepository : IInvoiceRepository
    {
        public InvoiceRecord? Invoice { get; set; } = TestData.Invoice();
        public IReadOnlyList<InvoiceLine> Lines { get; set; } = TestData.Lines();
        public Exception? LogError { get; set; }
        public List<InvoiceDocumentStatus> Statuses { get; } = [];
        public List<ApplicationLogEntry> Logs { get; } = [];
        public string? UploadedFileName { get; private set; }
        public string? FailureMessage { get; private set; }

        public Task<InvoiceRecord?> GetInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken) => Task.FromResult(Invoice);

        public Task<IReadOnlyList<InvoiceLine>> GetOrderLinesAsync(Guid orderId, CancellationToken cancellationToken) => Task.FromResult(Lines);

        public Task<Seller> GetSellerAsync(CancellationToken cancellationToken) => Task.FromResult(TestData.Seller);

        public Task SetStatusAsync(Guid invoiceId, InvoiceDocumentStatus status, CancellationToken cancellationToken)
        {
            Statuses.Add(status);
            return Task.CompletedTask;
        }

        public Task UploadDocumentAsync(Guid invoiceId, string fileName, byte[] content, CancellationToken cancellationToken)
        {
            UploadedFileName = fileName;
            return Task.CompletedTask;
        }

        public Task MarkGeneratedAsync(Guid invoiceId, DateTimeOffset generatedOn, CancellationToken cancellationToken)
        {
            Statuses.Add(InvoiceDocumentStatus.Generated);
            return Task.CompletedTask;
        }

        public Task MarkFailedAsync(Guid invoiceId, string userMessage, CancellationToken cancellationToken)
        {
            Statuses.Add(InvoiceDocumentStatus.Failed);
            FailureMessage = userMessage;
            return Task.CompletedTask;
        }

        public Task WriteLogAsync(ApplicationLogEntry entry, CancellationToken cancellationToken)
        {
            if (LogError is not null)
            {
                throw LogError;
            }

            Logs.Add(entry);
            return Task.CompletedTask;
        }
    }
}
