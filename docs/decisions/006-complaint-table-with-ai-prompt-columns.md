# 006. Complaint table with AI prompt columns

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Customers report problems: a machine breakdown during a rental, a disputed invoice, disputed operator hours, a late
delivery, damage found at return. There is no place to record and track them. Dynamics 365 Customer Service is not
available, so there is no standard `incident` table and no SLA engine.

For now, complaints are entered manually by employees. The owner also wants to try Dataverse **prompt columns**
to help the employee read a complaint quickly. Constraints found in the documentation:

- Prompt columns consume AI Builder credits or Copilot Credits on every run. AI Builder trials are discontinued and
  the Developer Plan has no seeded credits, so execution can fail with an entitlement error.
- They run asynchronously, on create or when an input column changes. There is no on-demand recalculation and no backfill.
- Inputs must be columns of the same table. The output is text.

## Options considered

Ownership:

1. **Organization-owned**: simplest security, but no owner, so no assignment and no "My complaints" view. Cannot be changed later.
2. **User/team-owned** with organization-level privileges in the role: same simple behaviour now, and access can be narrowed later.

Customer and order:

1. **Order required, customer derived from the order**: no duplication, but every complaint must have an order.
2. **Customer required, order optional**: also covers complaints not tied to an order (e.g. about phone service), but the
   customer is stored twice when an order is set.

Status:

1. **Custom choice column**: duplicates `statecode` and allows "closed but active" records.
2. **Built-in `statecode` / `statuscode`**: closed records become read-only and standard active/inactive views work.

## Decision

- New table `cr679_complaint`, **user/team-owned**, primary column is an autonumber (`REK-{SEQNUM:5}`).
- `cr679_customerid`: **Customer** column (`account` or `contact`, as in ADR-005), required.
- `cr679_orderid`: lookup to `cr679_order`, optional.
- `cr679_description`: multiline text, required, max 4,000 characters (also limits prompt cost).
- Lifecycle uses `statuscode`: Active = *New*, *In progress*, *Waiting for customer*; Inactive = *Closed*.
  English labels in 1033, Polish in 1045.
- Two prompt columns with `cr679_description` as the only input, output in Polish, read-only on the form and labelled as AI suggestions:
  - `cr679_aisummary`: short summary of the problem;
  - `cr679_ainextsteps`: suggested next steps, based on rental procedures described in the prompt.
- No SLA and no sentiment analysis for now.
- `cr679_order.cr679_customerid` becomes **Business Required**. An order without a customer cannot be invoiced anyway.

## Consequences

- **Customer/order consistency is not enforced on the server.** A form script filters the order lookup to the selected
  customer's orders and fills the customer from a selected order. That is UX only. It is accepted while intake is
  manual through the form. When another intake channel writes complaints (web form, e-mail, API), add a synchronous
  server-side check, most likely a C# plug-in.
- Without credits, prompt columns end with status *Failed* and stay empty. The form and processes must not depend
  on their values. Execution status is visible in the generated `_PromptColumnStatus` / `_PromptColumnDetails` columns.
- Each prompt column is a separate run with its own cost, on every change of the description.
- Changing a prompt does not update existing records until their description changes.
- Prompt columns can be created and edited only in DEV (requires "Block unmanaged customizations" off). The AI
  configuration components must be part of `RentMaszyny` to reach TST.
- Business Required is enforced by forms, not by the API.
- Existing orders without a customer must be fixed in DEV before the required level is changed.

## Alternatives rejected

- **Organization-owned**: the ownership type is irreversible and blocks assignment to a handler.
- **Order required**: excludes complaints that are not tied to a rental.
- **Custom status choice**: duplicates the platform's state model.
- **SLA now**: the business rule (response vs resolution time, how long) is not defined yet. When it is, start with a
  due-date column whose offset comes from an environment variable.
- **Sentiment column**: dropped to keep the first version small and reduce credit consumption.
