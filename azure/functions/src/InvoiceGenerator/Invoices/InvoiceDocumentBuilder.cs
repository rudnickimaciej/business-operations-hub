using System.Globalization;

namespace InvoiceGenerator.Invoices;

/// <summary>Validates the invoice snapshot against the order items and builds the document to render.</summary>
public static class InvoiceDocumentBuilder
{
    public static InvoiceDocument Build(InvoiceRecord invoice, IReadOnlyList<InvoiceLine> lines, Seller seller)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(invoice.Number)) missing.Add("numer faktury");
        if (string.IsNullOrWhiteSpace(invoice.CustomerName)) missing.Add("nabywca – nazwa");
        if (string.IsNullOrWhiteSpace(invoice.CustomerAddress)) missing.Add("nabywca – adres");
        if (invoice.Language is null) missing.Add("język faktury");
        if (invoice.IssueDate is null) missing.Add("data wystawienia");
        if (invoice.DueDate is null) missing.Add("termin płatności");
        if (invoice.NetAmount is null) missing.Add("kwota netto");
        if (invoice.VatRate is null) missing.Add("stawka VAT");
        if (invoice.VatAmount is null) missing.Add("kwota VAT");
        if (invoice.GrossAmount is null) missing.Add("kwota brutto");

        if (missing.Count > 0)
        {
            throw new InvoiceValidationException($"Brak danych na fakturze: {string.Join(", ", missing)}.");
        }

        if (lines.Count == 0)
        {
            throw new InvoiceValidationException("Zamówienie nie ma żadnych aktywnych pozycji.");
        }

        // The header amounts are a snapshot; the lines are read now. If they differ, the order changed after issuing.
        var linesTotal = lines.Sum(l => l.NetAmount);
        if (decimal.Round(linesTotal, 2) != decimal.Round(invoice.NetAmount!.Value, 2))
        {
            throw new InvoiceValidationException(
                $"Suma pozycji zamówienia ({linesTotal:N2}) różni się od kwoty netto faktury ({invoice.NetAmount:N2}).");
        }

        return new InvoiceDocument(
            invoice.Number!,
            CultureInfo.GetCultureInfo((int)invoice.Language!.Value), // choice values are LCIDs
            invoice.IssueDate!.Value,
            invoice.DueDate!.Value,
            seller,
            invoice.CustomerName!,
            string.IsNullOrWhiteSpace(invoice.CustomerNip) ? null : invoice.CustomerNip,
            invoice.CustomerAddress!,
            lines,
            invoice.NetAmount!.Value,
            invoice.VatRate!.Value,
            invoice.VatAmount!.Value,
            invoice.GrossAmount!.Value,
            string.IsNullOrWhiteSpace(invoice.CurrencyCode) ? "PLN" : invoice.CurrencyCode);
    }
}
