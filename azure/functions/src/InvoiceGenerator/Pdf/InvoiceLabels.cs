using System.Globalization;
using System.Resources;
using System.Runtime.CompilerServices;

namespace InvoiceGenerator.Pdf;

/// <summary>
/// Printed labels in the invoice's language. Texts live in InvoiceLabels.resx (English, the fallback) and
/// InvoiceLabels.&lt;culture&gt;.resx; adding a language means adding a .resx file and a choice value, no code.
/// Each property name is the resource key.
/// </summary>
public sealed class InvoiceLabels(CultureInfo culture)
{
    internal static readonly ResourceManager Resources = new(typeof(InvoiceLabels).FullName!, typeof(InvoiceLabels).Assembly);

    public string Title(string number) => Format(number);
    public string IssueDate => Get();
    public string DueDate => Get();
    public string Seller => Get();
    public string Buyer => Get();
    public string TaxId => Get();
    public string LineNumber => Get();
    public string Description => Get();
    public string NetValue(string currency) => Format(currency);
    public string NetTotal => Get();
    public string Vat(string rate) => Format(rate);
    public string AmountDue(string currency) => Format(currency);
    public string BankAccount => Get();
    public string Page => Get();
    public string Of => Get();

    private string Get([CallerMemberName] string key = "") =>
        Resources.GetString(key, culture) ?? throw new MissingManifestResourceException($"Invoice label '{key}' is missing.");

    private string Format(object arg, [CallerMemberName] string key = "") => string.Format(culture, Get(key), arg);
}
