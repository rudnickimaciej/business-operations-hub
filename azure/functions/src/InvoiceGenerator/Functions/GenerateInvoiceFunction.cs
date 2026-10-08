using Azure.Messaging.ServiceBus;
using InvoiceGenerator.Invoices;
using InvoiceGenerator.Messages;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RentMaszyny.Dataverse.Model;

namespace InvoiceGenerator.Functions;

/// <summary>
/// Triggered by the message the Dataverse Service Endpoint posts when an invoice is created
/// or its cr679_requestedon changes. Throwing makes Service Bus retry; after the last attempt the
/// message goes to the dead-letter queue.
/// </summary>
public sealed class GenerateInvoiceFunction(
    InvoiceProcessor processor,
    IConfiguration configuration,
    ILogger<GenerateInvoiceFunction> logger)
{
    [Function("GenerateInvoice")]
    public async Task Run(
        [ServiceBusTrigger("%InvoiceQueueName%", Connection = "ServiceBusConnection")] ServiceBusReceivedMessage message,
        CancellationToken cancellationToken)
    {
        var context = DataverseExecutionContext.Parse(message.Body.ToString());
        if (!string.Equals(context.PrimaryEntityName, cr679_invoice.EntityLogicalName, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("Message {MessageId} is for table '{Table}', not {Expected}; ignored.",
                message.MessageId, context.PrimaryEntityName, cr679_invoice.EntityLogicalName);
            return;
        }

        // OperationId is the Dataverse system job that posted the message: the best id to correlate both sides.
        var correlationId = context.OperationId != Guid.Empty ? context.OperationId : context.CorrelationId;
        var maxDeliveryCount = configuration.GetValue("InvoiceQueueMaxDeliveryCount", 5);

        using var scope = logger.BeginScope(new Dictionary<string, object>
        {
            ["InvoiceId"] = context.PrimaryEntityId,
            ["CorrelationId"] = correlationId,
            ["DeliveryCount"] = message.DeliveryCount,
        });

        var outcome = await processor.ProcessAsync(
            context.PrimaryEntityId,
            correlationId.ToString(),
            isLastAttempt: message.DeliveryCount >= maxDeliveryCount,
            cancellationToken);

        logger.LogInformation("{Message} on invoice {InvoiceId}: {Outcome}.", context.MessageName, context.PrimaryEntityId, outcome);
    }
}
