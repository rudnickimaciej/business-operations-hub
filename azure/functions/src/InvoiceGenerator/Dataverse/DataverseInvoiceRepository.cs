using System.Text.Json;
using InvoiceGenerator.Invoices;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Dataverse;

/// <summary>Dataverse implementation of <see cref="IInvoiceRepository"/>, using the early-bound model.</summary>
public sealed class DataverseInvoiceRepository(IOrganizationServiceAsync2 service) : IInvoiceRepository
{
    private const string SellerVariable = "cr679_InvoiceSeller";
    private const string CurrencyAlias = "currency";
    private const string CurrentValueAlias = "current";
    private const int UploadBlockSize = 4 * 1024 * 1024;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<InvoiceRecord?> GetInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        var query = new QueryExpression(cr679_invoice.EntityLogicalName)
        {
            ColumnSet = new ColumnSet(
                cr679_invoice.Fields.cr679_autonumber,
                cr679_invoice.Fields.cr679_documentstatus,
                cr679_invoice.Fields.cr679_language,
                cr679_invoice.Fields.cr679_orderid,
                cr679_invoice.Fields.cr679_customername,
                cr679_invoice.Fields.cr679_customernip,
                cr679_invoice.Fields.cr679_customeraddress,
                cr679_invoice.Fields.cr679_issuedate,
                cr679_invoice.Fields.cr679_duedate,
                cr679_invoice.Fields.cr679_netamount,
                cr679_invoice.Fields.cr679_vatrate,
                cr679_invoice.Fields.cr679_vatamount,
                cr679_invoice.Fields.cr679_grossamount),
            Criteria = { Conditions = { new ConditionExpression(cr679_invoice.Fields.cr679_invoiceId, ConditionOperator.Equal, invoiceId) } },
        };
        var currency = query.AddLink(
            TransactionCurrency.EntityLogicalName,
            cr679_invoice.Fields.TransactionCurrencyId,
            TransactionCurrency.Fields.TransactionCurrencyId,
            JoinOperator.LeftOuter);
        currency.EntityAlias = CurrencyAlias;
        currency.Columns = new ColumnSet(TransactionCurrency.Fields.ISOCurrencyCode);

        var row = (await service.RetrieveMultipleAsync(query, cancellationToken)).Entities.FirstOrDefault();
        if (row is null)
        {
            return null;
        }

        var invoice = row.ToEntity<cr679_invoice>();
        return new InvoiceRecord(
            invoice.Id,
            invoice.cr679_autonumber,
            (InvoiceDocumentStatus?)invoice.cr679_documentstatus,
            (InvoiceLanguage?)invoice.cr679_language,
            invoice.cr679_orderid?.Id,
            invoice.cr679_customername,
            invoice.cr679_customernip,
            invoice.cr679_customeraddress,
            ToDate(invoice.cr679_issuedate),
            ToDate(invoice.cr679_duedate),
            invoice.cr679_netamount?.Value,
            invoice.cr679_vatrate,
            invoice.cr679_vatamount?.Value,
            invoice.cr679_grossamount?.Value,
            row.GetAttributeValue<AliasedValue>($"{CurrencyAlias}.{TransactionCurrency.Fields.ISOCurrencyCode}")?.Value as string);
    }

    public async Task<IReadOnlyList<InvoiceLine>> GetOrderLinesAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var query = new QueryExpression(cr679_orderitem.EntityLogicalName)
        {
            ColumnSet = new ColumnSet(
                cr679_orderitem.Fields.cr679_OrderItem1,
                cr679_orderitem.Fields.cr679_ItemPrice,
                cr679_orderitem.Fields.cr679_MachineID),
            Criteria =
            {
                Conditions =
                {
                    new ConditionExpression(cr679_orderitem.Fields.cr679_OrderID, ConditionOperator.Equal, orderId),
                    new ConditionExpression(cr679_orderitem.Fields.statecode, ConditionOperator.Equal, (int)cr679_orderitem_statecode.Active),
                },
            },
            Orders = { new OrderExpression(cr679_orderitem.Fields.CreatedOn, OrderType.Ascending) },
        };

        var rows = await service.RetrieveMultipleAsync(query, cancellationToken);
        return rows.Entities
            .Select(row => row.ToEntity<cr679_orderitem>())
            .Select(item => new InvoiceLine(
                item.cr679_MachineID?.Name ?? item.cr679_OrderItem1 ?? "-",
                item.cr679_ItemPrice?.Value ?? 0m))
            .ToList();
    }

    public async Task<Seller> GetSellerAsync(CancellationToken cancellationToken)
    {
        var json = await GetEnvironmentVariableAsync(SellerVariable, cancellationToken)
            ?? throw new InvoiceValidationException($"Brak konfiguracji sprzedawcy (zmienna środowiskowa {SellerVariable}).");

        var seller = JsonSerializer.Deserialize<Seller>(json, JsonOptions);
        return seller is { Name.Length: > 0, Address.Length: > 0, Nip.Length: > 0 }
            ? seller
            : throw new InvoiceValidationException($"Niepełna konfiguracja sprzedawcy w zmiennej {SellerVariable}.");
    }

    public Task SetStatusAsync(Guid invoiceId, InvoiceDocumentStatus status, CancellationToken cancellationToken) =>
        service.UpdateAsync(new cr679_invoice { Id = invoiceId, cr679_documentstatus = (cr679_invoice_cr679_documentstatus)status }, cancellationToken);

    public Task MarkGeneratedAsync(Guid invoiceId, DateTimeOffset generatedOn, CancellationToken cancellationToken) =>
        service.UpdateAsync(new cr679_invoice
        {
            Id = invoiceId,
            cr679_documentstatus = (cr679_invoice_cr679_documentstatus)InvoiceDocumentStatus.Generated,
            cr679_generatedon = generatedOn.UtcDateTime,
            cr679_errormessage = null,
        }, cancellationToken);

    public Task MarkFailedAsync(Guid invoiceId, string userMessage, CancellationToken cancellationToken) =>
        service.UpdateAsync(new cr679_invoice
        {
            Id = invoiceId,
            cr679_documentstatus = (cr679_invoice_cr679_documentstatus)InvoiceDocumentStatus.Failed,
            cr679_errormessage = Truncate(userMessage, 4000),
        }, cancellationToken);

    public async Task UploadDocumentAsync(Guid invoiceId, string fileName, byte[] content, CancellationToken cancellationToken)
    {
        var init = (InitializeFileBlocksUploadResponse)await service.ExecuteAsync(new InitializeFileBlocksUploadRequest
        {
            Target = new EntityReference(cr679_invoice.EntityLogicalName, invoiceId),
            FileAttributeName = cr679_invoice.Fields.cr679_document,
            FileName = fileName,
        }, cancellationToken);

        var blockIds = new List<string>();
        for (var offset = 0; offset < content.Length; offset += UploadBlockSize)
        {
            var blockId = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
            blockIds.Add(blockId);
            await service.ExecuteAsync(new UploadBlockRequest
            {
                BlockId = blockId,
                BlockData = content.AsSpan(offset, Math.Min(UploadBlockSize, content.Length - offset)).ToArray(),
                FileContinuationToken = init.FileContinuationToken,
            }, cancellationToken);
        }

        await service.ExecuteAsync(new CommitFileBlocksUploadRequest
        {
            FileContinuationToken = init.FileContinuationToken,
            FileName = fileName,
            MimeType = "application/pdf",
            BlockList = blockIds.ToArray(),
        }, cancellationToken);
    }

    public Task WriteLogAsync(ApplicationLogEntry entry, CancellationToken cancellationToken) =>
        service.CreateAsync(new cr679_applicationlog
        {
            cr679_name = Truncate(entry.Name, 200),
            cr679_severity = (cr679_applicationlog_cr679_severity)entry.Severity,
            cr679_correlationid = Truncate(entry.CorrelationId, 100),
            cr679_source = "InvoiceGenerator",
            cr679_operation = entry.Operation,
            cr679_message = Truncate(entry.Message, 4000),
            cr679_details = entry.Details is null ? null : Truncate(entry.Details, 100000),
            cr679_tablename = cr679_invoice.EntityLogicalName,
            cr679_recordid = entry.RecordId.ToString(),
        }, cancellationToken);

    /// <summary>Current value of an environment variable, falling back to its default value.</summary>
    private async Task<string?> GetEnvironmentVariableAsync(string schemaName, CancellationToken cancellationToken)
    {
        var query = new QueryExpression(EnvironmentVariableDefinition.EntityLogicalName)
        {
            ColumnSet = new ColumnSet(EnvironmentVariableDefinition.Fields.DefaultValue),
            Criteria = { Conditions = { new ConditionExpression(EnvironmentVariableDefinition.Fields.SchemaName, ConditionOperator.Equal, schemaName) } },
        };
        var value = query.AddLink(
            EnvironmentVariableValue.EntityLogicalName,
            EnvironmentVariableDefinition.Fields.EnvironmentVariableDefinitionId,
            EnvironmentVariableValue.Fields.EnvironmentVariableDefinitionId,
            JoinOperator.LeftOuter);
        value.EntityAlias = CurrentValueAlias;
        value.Columns = new ColumnSet(EnvironmentVariableValue.Fields.Value);

        var row = (await service.RetrieveMultipleAsync(query, cancellationToken)).Entities.FirstOrDefault();
        if (row is null)
        {
            return null;
        }

        var current = row.GetAttributeValue<AliasedValue>($"{CurrentValueAlias}.{EnvironmentVariableValue.Fields.Value}")?.Value as string;
        return string.IsNullOrWhiteSpace(current) ? row.ToEntity<EnvironmentVariableDefinition>().DefaultValue : current;
    }

    // Date-only columns come back as midnight; the date part is what matters.
    private static DateOnly? ToDate(DateTime? value) => value is null ? null : DateOnly.FromDateTime(value.Value);

    private static string Truncate(string value, int maxLength) => value.Length <= maxLength ? value : value[..maxLength];
}
