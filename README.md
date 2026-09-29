# Business Operations Hub — Equipment Rental

A Power Platform portfolio project: a CRM-style solution for a construction equipment rental company.
A rental request enters the system, an employee guides it through a Business Process Flow,
and the process ends with an invoice sent to the customer.

> Portfolio project built on a Power Apps Developer Plan. It is not deployed in production.

## What it demonstrates

- Dataverse data modeling and security roles
- Model-driven app with a Business Process Flow
- Power Automate with centralized error logging
- ALM: solution source control, managed deployments DEV → TST, CI/CD with GitHub Actions
- Architecture decisions documented as ADRs

## Repository layout

| Path | Contents |
|---|---|
| `solutions/RentMaszyny/` | Unpacked Dataverse solution (single source of truth) |
| `config/` | Deployment settings per environment |
| `.github/workflows/` | CI/CD pipelines |
| `docs/decisions/` | Architecture Decision Records |
| `scripts/` | Helper scripts |

## Status

Work in progress. See [docs/decisions](docs/decisions/) for decisions made so far.
