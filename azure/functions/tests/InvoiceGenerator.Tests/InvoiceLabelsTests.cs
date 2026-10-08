using System.Collections;
using System.Globalization;
using System.Resources;
using InvoiceGenerator.Pdf;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Tests;

public class InvoiceLabelsTests
{
    private static HashSet<string> Keys(CultureInfo culture) =>
        InvoiceLabels.Resources.GetResourceSet(culture, createIfNotExists: true, tryParents: false)!
            .Cast<DictionaryEntry>()
            .Select(entry => (string)entry.Key)
            .ToHashSet();

    public static TheoryData<InvoiceLanguage> Languages()
    {
        var data = new TheoryData<InvoiceLanguage>();
        foreach (var language in Enum.GetValues<InvoiceLanguage>())
        {
            data.Add(language);
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(Languages))]
    public void Every_label_is_translated_for_every_invoice_language(InvoiceLanguage language)
    {
        var expected = Keys(CultureInfo.InvariantCulture);
        var culture = CultureInfo.GetCultureInfo((int)language);

        // English is the neutral resource itself; other languages need their own .resx with every key.
        var actual = culture.TwoLetterISOLanguageName == "en" ? expected : Keys(culture.Parent);

        Assert.Empty(expected.Except(actual));
    }

    [Fact]
    public void Every_label_property_has_a_resource_key()
    {
        var keys = Keys(CultureInfo.InvariantCulture);
        var properties = typeof(InvoiceLabels).GetProperties().Select(p => p.Name)
            .Concat(typeof(InvoiceLabels).GetMethods().Where(m => m.DeclaringType == typeof(InvoiceLabels) && m.IsPublic && !m.IsSpecialName).Select(m => m.Name));

        Assert.Empty(properties.Except(keys));
    }

    [Fact]
    public void Labels_follow_the_culture()
    {
        Assert.Equal("Faktura VAT FV-1", new InvoiceLabels(CultureInfo.GetCultureInfo("pl-PL")).Title("FV-1"));
        Assert.Equal("Invoice FV-1", new InvoiceLabels(CultureInfo.GetCultureInfo("en-US")).Title("FV-1"));
    }
}
