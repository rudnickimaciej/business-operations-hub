# ALM and deployment

How the `RentMaszyny` solution gets from DEV to TST. The reasoning is in
[ADR-001](decisions/001-alm-foundation.md) and [ADR-002](decisions/002-azure-devops-for-ci-cd.md).

## Flow

```text
DEV (unmanaged)  --/solution-sync-->  Git (GitHub, main)  --Azure Pipelines-->  TST (managed)
```

1. Change components in DEV, always from inside the `RentMaszyny` solution.
2. Sync to Git (`/solution-sync`), commit on a branch, open a PR to `main`.
3. The PR runs the **Build** stage: the solution must pack as managed.
4. After merge, the pipeline builds again, stamps the version (`1.0.yyyyMMdd.r`) and waits for approval on the `TST` environment.
5. After approval, the managed solution is imported into TST with *stage and upgrade*.

Pipeline: [`pipelines/deploy-rentmaszyny.yml`](../pipelines/deploy-rentmaszyny.yml).

Form scripts are built from TypeScript in `webresources/`. The Build stage runs the Jest tests, builds the bundles and
copies each `dist/<name>.js` over `solutions/RentMaszyny/src/WebResources/<name>` before packing. A new web resource
must first be created in DEV (any placeholder content), added to the solution and synced; the pipeline fails otherwise.

## One-time setup

### Entra ID

1. App registration, e.g. `sp-business-operations-hub-deploy`, single tenant.
2. Credential: client secret, or a federated credential (workload identity federation) if the Power Platform
   service connection type in your ADO org supports it. Federation is preferred because no secret expires or leaks.

### TST environment (after reset)

1. Power Platform admin center → TST → *Settings* → *Users + permissions* → *Application users* → *New app user*.
2. Select the app registration and assign **System Administrator**. That role is broader than least privilege,
   but solution import (tables, processes, apps) effectively requires it. Only the pipeline uses this identity.

### Azure DevOps

1. Install the **Power Platform Build Tools** extension in the organization.
2. Project settings → *Service connections*:
   - **GitHub** connection to `rudnickimaciej/business-operations-hub`;
   - **Power Platform** connection named `PowerPlatform-TST`, pointing to the TST URL with the app registration above.
3. *Pipelines* → *Environments* → create `TST` → *Approvals and checks* → add an approval (yourself).
4. *Pipelines* → *New pipeline* → GitHub → this repo → *Existing YAML file* → `/pipelines/deploy-rentmaszyny.yml`.

## What can go wrong

| Symptom | Likely cause |
|---|---|
| Import fails with a missing dependency | A component used by the app is not in the solution (e.g. an icon web resource). Add it in DEV and re-sync. |
| Changes deployed but not visible in TST | Someone customized TST directly; the unmanaged layer hides the managed one. Remove the unmanaged layer in TST. |
| `Cannot create a holding solution for missing base RentMaszyny` | The solution does not exist in TST yet (first deployment or TST reset). Run the pipeline manually with **First deployment** ticked. |
| `Unauthorized` / `The user is not a member of the organization` | The application user is missing in TST (for example after an environment reset). |

## Azure infrastructure (invoice generator)

Defined in [`azure/infra/main.bicep`](../azure/infra/main.bicep), one resource group per environment, region North Europe (West Europe does not accept new subscriptions; North Europe is also the cheapest of the EU regions checked),
in the subscription that belongs to the Dataverse tenant (ADR-004). Resources: Service Bus (Basic) with queue
`invoice-requests` and a send-only SAS rule for Dataverse, Function App (Flex Consumption, .NET isolated) with a managed
identity, Storage, Application Insights, Log Analytics, a monthly budget, and the identity's role assignments.

```bash
# one-time per subscription
for p in Microsoft.Web Microsoft.ServiceBus Microsoft.Storage Microsoft.Insights Microsoft.OperationalInsights Microsoft.Consumption; do
  az provider register --namespace $p
done

az group create --name rg-rentmachines-dev-neu --location northeurope --tags project=business-operations-hub env=dev

export DATAVERSE_URL=<DEV environment URL>        # not stored in the repo
export BUDGET_CONTACT_EMAIL=<alert e-mail>        # not stored in the repo
az deployment group what-if --resource-group rg-rentmachines-dev-neu --parameters azure/infra/dev.bicepparam
az deployment group create  --resource-group rg-rentmachines-dev-neu --parameters azure/infra/dev.bicepparam
```

After deployment (manual, once per environment):

1. Read the SAS connection string for Dataverse (never commit it):
   `az servicebus queue authorization-rule keys list -g <rg> --namespace-name <sb> --queue-name invoice-requests --name dataverse-send --query primaryConnectionString -o tsv`
   and set it on the Service Endpoint in the Plugin Registration Tool.
2. Get the managed identity's Application ID (`az ad sp show --id <functionPrincipalId output> --query appId -o tsv`)
   and create a Dataverse application user with the role `Invoice Generator Service`.

**Every solution import resets the Service Endpoint**, in TST and also in DEV when a packed solution is imported
there. The solution carries only the SAS key *name*, so the import clears the key and **disables both SDK steps**
(pac warns: "Configuration of required credentials must be completed"). After such an import:

1. Set the key again (step 1 above).
2. Enable both steps `invoices …: Create/Update of cr679_invoice` (Plugin Registration Tool, or set `statecode = 0`).
3. Touch `cr679_requestedon` on a test invoice and confirm `IncomingMessages` on the Service Bus namespace.

Successful endpoint jobs are auto-deleted, so an empty System Jobs list does not mean nothing was sent.
