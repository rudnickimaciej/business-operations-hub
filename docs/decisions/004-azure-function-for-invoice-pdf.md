# 004. Invoice PDF generation in an Azure Function behind a Service Bus queue

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

An invoice record (ADR-003) needs a PDF document attached to it. The tenant has no OneDrive or SharePoint
licence, so the usual Power Platform approach (Word Online "Populate a Microsoft Word template" and conversion
to PDF in OneDrive) is not available. Power Platform has no built-in PDF rendering. An Azure subscription is available.

## Options considered

1. **Word template + OneDrive conversion**: not possible without OneDrive/SharePoint licences.
2. **Third-party connector** (Encodian, Plumsail): no code, but a paid subscription and an external processor of invoice data.
3. **Azure Function called directly over HTTP** from a flow: simplest custom code option, but if the function
   is down the request fails, and retries have to be implemented in the flow.
4. **Azure Function triggered from a Service Bus queue**, fed by a Dataverse Service Endpoint: built-in retries
   and dead-lettering, Dataverse and the function are decoupled, no flow in between.

## Decision

Option 4:

- A Dataverse **Service Endpoint** posts a message to the Service Bus queue `invoice-requests` from an
  asynchronous step on `cr679_invoice` (Create, and Update filtered on `cr679_requestedon`, which only the
  "issue"/"retry" commands set, so the function's own updates never re-trigger it).
- Azure Function `InvoiceGenerator` (C#, .NET 8 isolated) reads the invoice and order data, renders the PDF with
  **QuestPDF**, uploads it to the file column `cr679_document` and updates the status.
- The function authenticates to Dataverse with a **managed identity** registered as an application user. There are no secrets.
- DEV resources are first created manually in the Azure portal (learning). Before TST is created, they are
  captured as Bicep (`azure/infra/`) and deployed by a pipeline, so TST is reproducible and never hand-made.

### Tenant placement

All Azure resources live in a subscription in the **same Entra ID tenant as Dataverse** (`rudnicki17`).
A first attempt used a subscription in another tenant: the Dataverse → Service Bus SAS connection works across
tenants, but the function's managed identity cannot be a Dataverse application user in a foreign tenant, and
secret-type environment variables require Key Vault in the Dataverse tenant. Cross-tenant would have required a
multi-tenant app registration with a federated credential, or a client secret.

## Consequences

- New operational surface: Service Bus namespace, Function App, Storage, Application Insights per environment.
  Expected cost is a few currency units per month (Service Bus Basic, Flex Consumption).
- Deployment order: Azure resources before the solution, because the Service Endpoint points to the queue.
- The Service Endpoint is exported with its namespace address and SAS key **name**, never the key (verified).
  The namespace address is DEV-specific, so in TST the endpoint must be re-pointed after import: preferably via
  Key Vault configuration (secret environment variable), otherwise by a post-deployment script.
- `pac solution sync` (2.11.2) drops service endpoints and steps from the unpacked source; `/solution-sync` restores them.
- Failures are visible in three places: invoice status, `cr679_applicationlog`, and Application Insights or the dead-letter queue.
- QuestPDF Community licence applies (free below USD 1M annual revenue). A commercial use would need a review.

## Alternatives rejected

- **Option 1**: licensing not available.
- **Option 2**: recurring cost and data processed by a third party, for something a small amount of code solves.
- **Option 3**: viable and simpler. Rejected in favour of queue-based retries and decoupling. A queue is more
  than the expected volume needs, and that trade-off is accepted deliberately to demonstrate the standard
  Dataverse-to-Azure integration pattern.
