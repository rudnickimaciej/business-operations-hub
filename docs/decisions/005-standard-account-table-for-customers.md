# 005. Standard `account` and `contact` tables for customers (Customer column)

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Customers were stored in a custom table `cr679_clients` (name, address, e-mail, phone, NIP, and a client type
"Firma" / "Osoba prywatna"). This duplicates the standard Dataverse `account` and `contact` tables, which exist in
every environment, also without Dynamics 365 licences. The invoice design (ADR-003) needs a customer reference,
so this has to be settled before the invoice table is created.

## Options considered

1. **Keep `cr679_clients`**: full control over the columns, but address, e-mail and timeline features are rebuilt,
   and standard tools and connectors don't recognise the table as a customer.
2. **`account` only**: private persons are also accounts, and the client type column stays. One source of customer data.
3. **Customer column (`account` or `contact`)**: companies are accounts, private persons are contacts, and the
   table itself expresses the client type. Standard Dataverse customer model.

## Decision

Option 3. Order and invoice reference the customer through a **Customer** column `cr679_customerid`
(`account` or `contact`). `account` gets a custom column `cr679_nip`. The client type column is not carried over.
`cr679_clients` is retired after its data and lookups are migrated: "Firma" → `account`, "Osoba prywatna" → `contact`.

## Consequences

- The lookup is polymorphic. Every consumer has to handle both tables:
  - Web API returns `_cr679_customerid_value` with a lookup-logical-name annotation;
  - Power Fx needs `IsType` / `AsType`;
  - the invoice generator renders a company (name, NIP) or a person (full name, no NIP);
  - Power BI needs both tables or a combined customer dimension.
- `contact` is also used for contact persons of companies (`parentcustomerid`). Selecting a company's contact person as the
  customer on an order is a possible user error. If it happens in practice, the order's customer lookup view should be filtered
  to contacts without a parent account.
- `account` and `contact` are added to the solution **without "include all objects"**: only new columns and the forms and views that are actually changed.
- Removing `cr679_clients` from the solution deletes the table in TST on the next stage-and-upgrade deployment.
  TST holds only test data, so this is acceptable.
- Security roles must grant privileges on `account` and `contact`, which are shared by every app in the environment.

## Alternatives rejected

- **Keep `cr679_clients`**: rebuilds standard functionality and isolates customer data from the platform.
- **`account` only**: simpler for invoicing and reporting, but models private persons as organisations and keeps a
  type column that duplicates what the table could express.
