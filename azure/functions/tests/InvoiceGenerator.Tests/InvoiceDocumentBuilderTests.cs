using InvoiceGenerator.Invoices;

namespace InvoiceGenerator.Tests;

public class InvoiceDocumentBuilderTests
{
    [Fact]
    public void Build_maps_a_complete_invoice()
    {
        var document = InvoiceDocumentBuilder.Build(TestData.Invoice(), TestData.Lines(), TestData.Seller);

        Assert.Equal("FV-01000", document.Number);
        Assert.Equal(2, document.Lines.Count);
        Assert.Equal(4305m, document.GrossAmount);
        Assert.Equal("6762045116", document.BuyerNip);
        Assert.Equal("pl-PL", document.Culture.Name);
    }

    [Fact]
    public void Build_treats_an_empty_nip_as_a_private_person()
    {
        var invoice = TestData.Invoice() with { CustomerNip = " " };

        Assert.Null(InvoiceDocumentBuilder.Build(invoice, TestData.Lines(), TestData.Seller).BuyerNip);
    }

    [Fact]
    public void Build_lists_every_missing_field()
    {
        var invoice = TestData.Invoice() with { CustomerName = null, IssueDate = null, NetAmount = null, Language = null };

        var error = Assert.Throws<InvoiceValidationException>(() => InvoiceDocumentBuilder.Build(invoice, TestData.Lines(), TestData.Seller));

        Assert.Contains("nabywca – nazwa", error.Message);
        Assert.Contains("data wystawienia", error.Message);
        Assert.Contains("kwota netto", error.Message);
        Assert.Contains("język faktury", error.Message);
    }

    [Fact]
    public void Build_rejects_an_order_without_items()
    {
        Assert.Throws<InvoiceValidationException>(() => InvoiceDocumentBuilder.Build(TestData.Invoice(), [], TestData.Seller));
    }

    [Fact]
    public void Build_rejects_items_that_do_not_add_up_to_the_net_amount()
    {
        var lines = new List<InvoiceLine> { new("Koparka", 2500m) };

        var error = Assert.Throws<InvoiceValidationException>(() => InvoiceDocumentBuilder.Build(TestData.Invoice(), lines, TestData.Seller));

        Assert.Contains("różni się", error.Message);
    }
}
