# 001. ALM foundation: single solution as the source of truth

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

The project must demonstrate professional Power Platform ALM. Constraints:

- Power Apps Developer Plan — two environments are available: DEV and TST. There is no separate PROD,
  so TST plays the role of production.
- One developer, small scope.
- The repository is public; no environment-specific data or secrets may be committed.

An earlier plan kept apps and flows in separate `power-apps/` and `power-automate/` folders next to
`solutions/`. Because unpacking a solution already produces the source of apps and flows, that would
create two copies of the same component with no clear owner.

## Options considered

1. **Separate folders per component type plus solution exports** — familiar layout, but duplicates
   components and allows them to drift apart.
2. **One unpacked solution (`pac solution clone` / `sync`) as the only source** — one place to review,
   diff and build from.
3. **Several solutions (e.g. data model / apps / flows)** — supports independent release cycles, but adds
   dependency management that the project's size doesn't need.

## Decision

- One unmanaged solution, `RentMaszyny`, publisher prefix `cr679`, developed in DEV. It already contains
  the existing app. The unique name stays as is; renaming would require moving every component to a new solution.
- Source control: `solutions/RentMaszyny/` created with `pac solution clone` and updated with
  `pac solution sync`. It is the single source of truth.
- TST (acting as PROD) receives only the **managed** build of that solution, deployed by a pipeline, never by hand.
- Environment-specific values (environment variables, connection references) live in
  `config/deployment-settings.<env>.json`, not in the solution.
- ALM and security are in place from the first component. They are not added later.

## Consequences

- Every change made in DEV must be synced to Git; otherwise the repo is out of date. The `/solution-sync` skill covers this.
- Managed solutions in TST cannot be edited there, so fixes always go through DEV.
- Before the first managed deployment, TST must be cleaned of earlier unmanaged experiment solutions
  (`Core`, `UI`, `Security`, `Automations`, `Customization`, …). Deleting an unmanaged solution does not delete
  its components. Any leftover `cr679_` components would stay as an unmanaged layer above the managed
  solution and hide deployed changes.

## Alternatives rejected

- **Option 1**: duplicated sources of truth.
- **Option 3** (layered split such as Core / Security / UI): each layer adds an import step, a cross-solution
  dependency and a version number to keep in sync, and gives no benefit with one developer, one app and one
  release cadence.

## Revisit when

Splitting the solution becomes a new ADR if any of these becomes true:

- parts of the solution need a different release cadence (e.g. the data model changes rarely, the app often);
- a second app or another team reuses the core tables and deploys independently;
- a component with its own lifecycle is added (e.g. a Power BI report or a Copilot Studio agent).
