using InvoiceGenerator.Invoices;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InvoiceGenerator.Pdf;

public interface IInvoiceRenderer
{
    byte[] Render(InvoiceDocument invoice);
}

/// <summary>Renders the invoice as an A4 PDF in the invoice's language (labels, dates and number formats).</summary>
public sealed class QuestPdfInvoiceRenderer : IInvoiceRenderer
{
    public byte[] Render(InvoiceDocument invoice)
    {
        var labels = new InvoiceLabels(invoice.Culture);
        string Money(decimal value) => value.ToString("N2", invoice.Culture);
        string Date(DateOnly value) => value.ToString("d", invoice.Culture);

        return Document.Create(container => container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(40);
            page.DefaultTextStyle(x => x.FontSize(10));

            page.Header().Column(column =>
            {
                column.Item().Text(labels.Title(invoice.Number)).FontSize(20).SemiBold();
                column.Item().Text($"{labels.IssueDate}: {Date(invoice.IssueDate)}");
                column.Item().Text($"{labels.DueDate}: {Date(invoice.DueDate)}");
            });

            page.Content().PaddingVertical(20).Column(column =>
            {
                column.Spacing(20);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Element(c => Party(c, labels, labels.Seller, invoice.Seller.Name, invoice.Seller.Nip, invoice.Seller.Address));
                    row.ConstantItem(30);
                    row.RelativeItem().Element(c => Party(c, labels, labels.Buyer, invoice.BuyerName, invoice.BuyerNip, invoice.BuyerAddress));
                });

                column.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(30);
                        columns.RelativeColumn();
                        columns.ConstantColumn(110);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Element(HeaderCell).Text(labels.LineNumber);
                        header.Cell().Element(HeaderCell).Text(labels.Description);
                        header.Cell().Element(HeaderCell).AlignRight().Text(labels.NetValue(invoice.CurrencyCode));
                    });

                    foreach (var (line, index) in invoice.Lines.Select((line, index) => (line, index)))
                    {
                        table.Cell().Element(BodyCell).Text((index + 1).ToString(invoice.Culture));
                        table.Cell().Element(BodyCell).Text(line.Description);
                        table.Cell().Element(BodyCell).AlignRight().Text(Money(line.NetAmount));
                    }
                });

                column.Item().AlignRight().Width(230).Column(totals =>
                {
                    TotalRow(totals, labels.NetTotal, Money(invoice.NetAmount));
                    TotalRow(totals, labels.Vat(invoice.VatRate.ToString("0.##", invoice.Culture)), Money(invoice.VatAmount));
                    TotalRow(totals, labels.AmountDue(invoice.CurrencyCode), Money(invoice.GrossAmount), bold: true);
                });

                if (!string.IsNullOrWhiteSpace(invoice.Seller.BankAccount))
                {
                    column.Item().Text($"{labels.BankAccount}: {invoice.Seller.BankAccount}");
                }
            });

            page.Footer().AlignCenter().Text(text =>
            {
                text.Span($"{labels.Page} ");
                text.CurrentPageNumber();
                text.Span($" {labels.Of} ");
                text.TotalPages();
            });
        })).GeneratePdf();
    }

    private static void Party(IContainer container, InvoiceLabels labels, string title, string name, string? taxId, string address) =>
        container.Column(column =>
        {
            column.Item().Text(title).SemiBold();
            column.Item().Text(name);
            column.Item().Text(address);
            if (!string.IsNullOrWhiteSpace(taxId))
            {
                column.Item().Text($"{labels.TaxId}: {taxId}");
            }
        });

    private static void TotalRow(ColumnDescriptor column, string label, string value, bool bold = false) =>
        column.Item().Row(row =>
        {
            var left = row.RelativeItem().Text(label);
            var right = row.ConstantItem(100).AlignRight().Text(value);
            if (bold)
            {
                left.SemiBold();
                right.SemiBold();
            }
        });

    private static IContainer HeaderCell(IContainer c) =>
        c.BorderBottom(1).BorderColor(Colors.Grey.Darken1).PaddingVertical(4).DefaultTextStyle(x => x.SemiBold());

    private static IContainer BodyCell(IContainer c) =>
        c.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4);
}
