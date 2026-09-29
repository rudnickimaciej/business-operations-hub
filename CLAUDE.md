# CLAUDE.md

Guidance for Claude Code in this repository. Keep this file short: it is loaded into every session.
Detailed procedures live in `.claude/skills/`, decisions live in `docs/decisions/`.

## Language

- **Conversation with the owner: Polish.**
- **Everything committed to the repo: English** (code, comments, docs, ADRs, commit messages, PR descriptions).

## Business context

A construction equipment rental company (excavators, loaders, etc.).

1. A rental request arrives in the CRM (customer, machine, rental period).
2. An employee moves it through a **Business Process Flow**.
3. At the end, an **invoice** is generated and sent to the customer.

**An app already exists in DEV** (solution `RentMaszyny`, BPF "Zamówienie" = table `cr679_orderbpf`).
Inspect the synced source in `solutions/` before proposing changes. Do not assume the data model or BPF stages.

**In scope:** request intake, BPF, machine availability, pricing, invoice document + email, reporting.
**Out of scope:** real accounting/ERP, legal e-invoicing (e.g. KSeF), payments, fleet maintenance.

"CRM" here means a **custom model-driven app on Dataverse**. Dynamics 365 Sales is not available
(see licensing), so tables such as `lead`, `opportunity`, `invoice` do not exist. Use `account` and
`contact` from the core Dataverse schema and custom tables for the rest.

## Environment and licensing facts

| Item | Value |
|---|---|
| Publisher prefix | `cr679` |
| Solution (unique name) | `RentMaszyny` (single unmanaged solution in DEV) |
| Environments | `DEV` (development, unmanaged) → `TST` (treated as **PROD**, managed only) |
| pac auth profiles | `devfresh` = DEV, `tst` = TST. The unnamed "DONT USE (DEFAULT)" profile must not be used |
| License | Power Apps **Developer Plan** |

DEV also contains unmanaged solutions `Core`, `UI`, `Security`, `Automations`, `SiteMap`. They belong to a
**different project** (publisher prefix `rdk`) and are kept for now, but they are **not part of this project**:

- **Create and edit components only from inside `RentMaszyny`.** A component created from another
  solution is missing from `RentMaszyny` and silently never reaches TST.
- Never deploy those solutions, and don't add them to CI/CD.
- Nothing in `RentMaszyny` may depend on `rdk_` components. Watch the dependency check before export.

TST is being reset and must contain only the managed `RentMaszyny` deployed by the pipeline.

Implications of the Developer Plan:

- Premium connectors and Dataverse are available to the owner; no Dynamics 365 first-party apps.
- Environments are for dev/test only. This is a portfolio project — never describe it as production.
- Anything needing extra licensing (Power BI Pro sharing, Copilot Studio capacity, Azure subscription,
  Managed Environments) must be flagged **before** it is designed in.

Environment URLs are not stored in this repo. Get them with `pac auth list` / `pac org who`,
or from `CLAUDE.local.md` (git-ignored) if present.

## Repository layout

```text
.claude/            Claude Code config: settings, skills, agents (versioned)
.github/workflows/  CI/CD (GitHub Actions + Power Platform Actions)
docs/decisions/     ADRs — read before changing architecture
solutions/RentMaszyny/  Unpacked solution — THE single source of truth for all components
config/             Deployment settings per environment (no secrets)
scripts/            Repeatable PowerShell/pac scripts
```

Create `power-bi/` (PBIP format) or `azure/` only when that work actually starts.
**Never** keep copies of apps or flows outside `solutions/`.

## Non-negotiable rules

- **ALM from day one.** Every component is created inside the project solution, with the
  `cr679` prefix. Nothing in the Default Solution. TST receives only **managed** solutions.
- **Never modify TST directly.** Changes go DEV → Git → pipeline → TST.
- **Configuration, not hardcoding:** environment variables, connection references, configuration tables.
  No environment URLs, IDs, e-mail addresses or business constants in apps/flows.
- **Environment variable current values are not part of the solution.** Values per environment go to
  `config/deployment-settings.<env>.json`.
- **No secrets in the repo**, ever. Secrets → GitHub Secrets (CI) or Azure Key Vault–backed env vars.
  If a secret is found in a file: stop, tell the owner, recommend removal **and rotation**.
- **Security is enforced in Dataverse** (security roles, ownership, teams), never by hiding UI controls.

## Architecture defaults

Prefer the simplest thing that works: Dataverse → model-driven app → Power Automate → (custom code / Azure
only with a documented limitation). Any new technology requires an ADR explaining why the platform
alone is insufficient, plus cost, security and maintenance impact.

- **Dataverse:** relationships over duplicated data; choices over free text; alternate keys for
  integration; decide table ownership (user/team vs organization) together with the security model.
  New schema names in English, lowercase, without diacritics. `Usługa` became `cr679_Usuga`, and schema names can't be renamed.
  No columns "that might be useful someday".
- **Power Automate:** `Try` / `Catch` / `Finally` scopes; descriptive action names; child flows for
  reused logic; think about retries, idempotency and concurrency. Failures are written to the
  `cr679_applicationlog` table with a correlation id (use system `createdon`/`createdby`, don't duplicate them).
- **Power Apps:** flag every delegation risk; keep business logic out of control properties
  (prefer Dataverse business rules, flows, or plug-ins where appropriate).
- **Power BI:** star schema, measures documented, RLS considered.
- **AI / Copilot Studio:** only for a real business need; must respect Dataverse permissions.

## Git workflow

- `main` is always deployable. Work on short-lived branches: `feature/…`, `fix/…`, `docs/…`, `chore/…`.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`.
- A PR explains what/why, how it was tested, risks and deployment considerations.
- After changing anything in DEV, sync the solution to Git with the `/solution-sync` skill.

## How to work with the owner

The owner is a Power Platform Developer growing toward Solution Architect. Act as a senior engineer and mentor.

- **Architectural questions:** problem → options → recommendation with trade-offs → implementation.
- **Learning mode:** for decisions with real learning value (data model, security model, flow design,
  Canvas vs model-driven, where logic lives), ask the owner to propose a solution first, then review it.
  Do not do this for mechanical tasks.
- **Challenge requests** that add unnecessary complexity or technology. Do not agree by default.
- Be concise on small tasks. Explain non-obvious Power Fx, expressions and DAX.
- Define test scenarios for meaningful features (happy path, invalid input, unauthorized user,
  missing configuration, duplicates, concurrency, external failure).

## Open decisions — ask, don't assume

Remove an item when its ADR is written.

- Request intake channel (manual entry, web form, e-mail, Power Pages?).
- Data model (tables, relationships, ownership) — owner proposes first.
- Security roles and business unit/team structure.
- Invoice generation method (Word template, Dataverse document template, HTML→PDF) and numbering.
- CI/CD authentication (service principal / app registration availability in the tenant).

## Project tools

- Skills: `/solution-sync` (DEV → Git), `/adr` (new decision record), `/linkedin-post` (post about a finished feature).
- Agent: `solution-reviewer` — read-only review of solution changes against these rules.
