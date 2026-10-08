using System.Globalization;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Invoices;

/// <summary>Invoice header as stored in Dataverse. Customer data and amounts are a snapshot taken at issue time.</summary>
public sealed record InvoiceRecord(
    Guid Id,
    string? Number,
    InvoiceDocumentStatus? Status,
    InvoiceLanguage? Language,
    Guid? OrderId,
    string? CustomerName,
    string? CustomerNip,
    string? CustomerAddress,
    DateOnly? IssueDate,
    DateOnly? DueDate,
    decimal? NetAmount,
    decimal? VatRate,
    decimal? VatAmount,
    decimal? GrossAmount,
    string? CurrencyCode);

public sealed record InvoiceLine(string Description, decimal NetAmount);

/// <summary>Seller details, read from the Dataverse environment variable cr679_InvoiceSeller (JSON).</summary>
public sealed record Seller(string Name, string Address, string Nip, string? BankAccount);

/// <summary>Everything the renderer needs. Built only from validated data. Culture drives labels and number/date formats.</summary>
public sealed record InvoiceDocument(
    string Number,
    CultureInfo Culture,
    DateOnly IssueDate,
    DateOnly DueDate,
    Seller Seller,
    string BuyerName,
    string? BuyerNip,
    string BuyerAddress,
    IReadOnlyList<InvoiceLine> Lines,
    decimal NetAmount,
    decimal VatRate,
    decimal VatAmount,
    decimal GrossAmount,
    string CurrencyCode);

/// <summary>
/// A problem in the invoice data that retrying cannot fix (missing amounts, no order items, ...).
/// The message is shown to the app's users on the invoice, so it is in Polish regardless of the invoice language.
/// </summary>
public sealed class InvoiceValidationException(string message) : Exception(message);
