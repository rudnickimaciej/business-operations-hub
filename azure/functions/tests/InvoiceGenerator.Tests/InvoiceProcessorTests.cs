using InvoiceGenerator.Invoices;
using InvoiceGenerator.Pdf;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Xrm.Sdk;
using RentMaszyny.Dataverse.Common.Notifications;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Tests;

public class InvoiceProcessorTests
{
    private readonly FakeRepository repository = new();
    private readonly FakeRenderer renderer = new();
    private readonly FakeNotificationSender notifications = new();

    private InvoiceProcessor Processor() =>
        new(repository, renderer, notifications, TimeProvider.System, NullLogger<InvoiceProcessor>.Instance);

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
    public async Task Marks_an_invoice_without_status_failed_and_tells_the_user()
    {
        repository.Invoice = TestData.Invoice(status: null);

        Assert.Equal(ProcessingOutcome.Failed, await Process());

        Assert.Equal([InvoiceDocumentStatus.Failed], repository.Statuses);
        Assert.Equal(InvoiceProcessor.MissingStatusMessage, repository.FailureMessage);
        Assert.Equal(LogSeverity.Warning, Assert.Single(repository.Logs).Severity);
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

    [Fact]
    public async Task Tells_the_owner_that_the_invoice_is_ready()
    {
        await Process();

        var notification = Assert.Single(notifications.Sent);
        Assert.Equal(new EntityReference("systemuser", TestData.OwnerId), notification.OwnerId);
        Assert.Equal("Faktura FV-01000 jest gotowa", notification.Title);
        Assert.Equal(notification_iconid.Success, notification.IconType);
        Assert.Contains($"id={TestData.InvoiceId}", notification.Data);
    }

    [Fact]
    public async Task Tells_the_owner_why_the_invoice_failed()
    {
        repository.Invoice = TestData.Invoice() with { OrderId = null };

        await Process();

        var notification = Assert.Single(notifications.Sent);
        Assert.Equal(notification_iconid.Failure, notification.IconType);
        Assert.Equal("Nie udało się wygenerować faktury FV-01000", notification.Title);
        Assert.Equal("Faktura nie jest powiązana z zamówieniem.", notification.Body);
    }

    [Fact]
    public async Task Tells_the_owner_about_a_technical_failure_only_on_the_last_attempt()
    {
        renderer.Error = new TimeoutException("Dataverse timeout");

        await Assert.ThrowsAsync<TimeoutException>(() => Process(isLastAttempt: false));
        Assert.Empty(notifications.Sent);

        repository.Invoice = TestData.Invoice(status: InvoiceDocumentStatus.Generating);
        await Assert.ThrowsAsync<TimeoutException>(() => Process(isLastAttempt: true));
        Assert.Equal(InvoiceProcessor.TechnicalFailureMessage, Assert.Single(notifications.Sent).Body);
    }

    [Fact]
    public async Task Does_not_notify_when_a_team_owns_the_invoice()
    {
        repository.Invoice = TestData.Invoice() with { OwnerUserId = null };

        Assert.Equal(ProcessingOutcome.Generated, await Process());
        Assert.Empty(notifications.Sent);
    }

    [Fact]
    public async Task A_failing_notification_does_not_change_the_outcome()
    {
        notifications.Error = new InvalidOperationException("notifications disabled");

        Assert.Equal(ProcessingOutcome.Generated, await Process());
        Assert.Equal(InvoiceDocumentStatus.Generated, repository.Statuses[^1]);
    }

    private sealed class FakeNotificationSender : IAsyncAppNotificationSender
    {
        public Exception? Error { get; set; }
        public List<appnotification> Sent { get; } = [];

        public Task<Guid> SendAsync(appnotification notification, CancellationToken cancellationToken = default)
        {
            if (Error is not null)
            {
                throw Error;
            }

            Sent.Add(notification);
            return Task.FromResult(Guid.NewGuid());
        }
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
