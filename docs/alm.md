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
