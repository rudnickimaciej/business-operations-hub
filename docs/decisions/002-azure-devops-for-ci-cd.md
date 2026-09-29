# 002. Azure DevOps Pipelines for CI/CD, GitHub for source control

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

The solution needs automated build and deployment DEV → TST (see ADR-001). The source code is in a public
GitHub repository, which is part of the portfolio. The owner already has working Azure DevOps pipelines for
Dynamics 365 / Power Platform from another project.

## Options considered

1. **GitHub Actions** with `microsoft/powerplatform-actions`: everything in one place, simple for a public repo.
2. **Azure DevOps Pipelines** with Power Platform Build Tools, source code remaining in GitHub: environments
   with approvals, variable groups and service connections, a common setup in Microsoft enterprise projects.
3. **Power Platform Pipelines** (in-product): the least setup, but deployment is driven from the maker portal
   instead of Git, so the repository would not be the source of truth.

## Decision

Azure DevOps Pipelines (YAML in `pipelines/`), triggered by the GitHub repository through a GitHub service
connection. Source code stays in GitHub.

## Consequences

- CI/CD definitions are versioned in this repo, but runs, approvals and secrets live in Azure DevOps.
  Setup steps are documented in `docs/alm.md`.
- Two platforms to maintain access for (GitHub and Azure DevOps).
- Existing pipeline patterns can be reused, but TST deployments are managed-only (ADR-001). The earlier pattern
  of unmanaged imports with overwrite is not carried over.

## Alternatives rejected

- **GitHub Actions**: viable. Rejected because Azure DevOps matches the owner's existing tooling and the setup common in Microsoft enterprise projects.
- **Power Platform Pipelines**: deployments would not originate from Git, which contradicts ADR-001.
