using InvoiceGenerator.Invoices;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Tests;

internal static class TestData
{
    public static readonly Guid InvoiceId = Guid.Parse("9ba1a68a-afc0-f111-aaad-6045bddce132");
    public static readonly Guid OrderId = Guid.Parse("11111111-2222-3333-4444-555555555555");

    public static readonly Seller Seller = new("Wypożyczalnia Maszyn Test Sp. z o.o.", "ul. Testowa 1, 00-001 Warszawa", "5270123459", "00 1111 2222 3333 4444 5555 6666");

    /// <summary>A 1 x 1 px PNG: enough for the renderer to embed an image.</summary>
    public static readonly byte[] Logo = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==");

    public static InvoiceRecord Invoice(InvoiceDocumentStatus? status = InvoiceDocumentStatus.Requested, InvoiceLanguage? language = InvoiceLanguage.Polish) => new(
        InvoiceId,
        Number: "FV-01000",
        Status: status,
        Language: language,
        OrderId: OrderId,
        CustomerName: "Drogbud Kraków S.A.",
        CustomerNip: "6762045116",
        CustomerAddress: "ul. Wielicka 88, 30-552 Kraków",
        IssueDate: new DateOnly(2026, 10, 5),
        DueDate: new DateOnly(2026, 10, 19),
        NetAmount: 3500m,
        VatRate: 23m,
        VatAmount: 805m,
        GrossAmount: 4305m,
        CurrencyCode: "PLN");

    public static IReadOnlyList<InvoiceLine> Lines() =>
    [
        new("Koparka gąsienicowa CAT 320", 2500m),
        new("Ładowarka kołowa Volvo L60", 1000m),
    ];
}
