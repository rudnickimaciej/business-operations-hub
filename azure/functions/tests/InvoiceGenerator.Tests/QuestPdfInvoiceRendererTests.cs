using System.Text;
using InvoiceGenerator.Invoices;
using InvoiceGenerator.Pdf;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Tests;

public class QuestPdfInvoiceRendererTests
{
    static QuestPdfInvoiceRendererTests() =>
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

    [Theory]
    [InlineData(InvoiceLanguage.Polish)]
    [InlineData(InvoiceLanguage.English)]
    public void Render_produces_a_pdf_in_the_invoice_language(InvoiceLanguage language)
    {
        var invoice = TestData.Invoice(language: language) with { CustomerName = "Magdalena Wójcik", CustomerNip = null };
        var document = InvoiceDocumentBuilder.Build(invoice, TestData.Lines(), TestData.Seller);

        var pdf = new QuestPdfInvoiceRenderer().Render(document);

        Assert.StartsWith("%PDF", Encoding.ASCII.GetString(pdf, 0, 4));
        Assert.True(pdf.Length > 1_000);

        // Handy for a visual check: dotnet test, then open the files from the test output folder.
        File.WriteAllBytes(Path.Combine(AppContext.BaseDirectory, $"sample-invoice-{language}.pdf"), pdf);
    }
}
