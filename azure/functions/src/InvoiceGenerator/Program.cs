using Azure.Core;
using Azure.Identity;
using InvoiceGenerator.Dataverse;
using InvoiceGenerator.Invoices;
using InvoiceGenerator.Pdf;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.PowerPlatform.Dataverse.Client;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community; // ADR-004

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // Managed identity in Azure; your az / Visual Studio login when running locally. No secrets either way.
        services.AddSingleton<TokenCredential>(_ => new DefaultAzureCredential());
        services.AddSingleton<IOrganizationServiceAsync2>(sp =>
        {
            var dataverseUrl = new Uri(context.Configuration["DataverseUrl"]
                ?? throw new InvalidOperationException("App setting 'DataverseUrl' is missing."));
            var scope = $"{dataverseUrl.GetLeftPart(UriPartial.Authority)}/.default";
            var credential = sp.GetRequiredService<TokenCredential>();

            return new ServiceClient(
                dataverseUrl,
                async _ => (await credential.GetTokenAsync(new TokenRequestContext([scope]), CancellationToken.None)).Token,
                useUniqueInstance: true);
        });

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IInvoiceRenderer, QuestPdfInvoiceRenderer>();
        services.AddSingleton<IInvoiceRepository, DataverseInvoiceRepository>();
        services.AddSingleton<InvoiceProcessor>();
    })
    .Build();

host.Run();
