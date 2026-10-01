# 003. Invoice as a separate table, issued by an explicit user action

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

The rental process ends in the BPF stage "Rozliczenie" with an invoice for the customer. The `cr679_order`
table already has `cr679_invoicedate`, `cr679_paymentdate` and `cr679_totalprice`. Dynamics 365 Sales is not
available, so there is no standard `invoice` table.

Requirements: an invoice number, amounts fixed at the moment of issue, a PDF document, a visible processing status,
and safe retry after a failure without issuing a second invoice.

## Options considered

Where the invoice lives:

1. **Columns on Order**: fewer tables, but issued data changes whenever the order or customer changes, and an
   order can have only one invoice.
2. **Separate table `cr679_invoice`** related to the order, holding a snapshot of customer data and amounts.

What starts issuing:

1. **Automatically when the BPF enters "Rozliczenie"**: no extra click, but moving the BPF back and forward
   re-triggers it, and a legal document becomes a side effect of navigation.
2. **A "Wystaw fakturę" command on the Order form** (modern command, Power Fx).

## Decision

- Separate table `cr679_invoice` (data model in [docs/invoicing.md](../invoicing.md)).
- Issued by a command button on Order. The command checks that the order has no active invoice, creates the invoice
  with status *Requested* and copies the customer data (account or contact, ADR-005) and amounts from the order.
- Amounts (net, VAT, gross) are calculated **in Dataverse**. The document generator only renders them.
- Numbering uses a Dataverse autonumber column (`FV-{SEQNUM:5}`): server-side and safe under concurrency.

## Consequences

- An order total must be **current** when the invoice is created. The order total is a **rollup column**
  (sum of order items). Rollups are recalculated asynchronously (by default every hour), so the command first
  forces a recalculation (`CalculateRollupField`) and only then copies the total. If calling it from a Power Fx
  command turns out not to be supported, the command is implemented as a TypeScript web resource instead.
- Autonumber sequences do not restart every year and may have gaps. This is acceptable, because legal invoicing (KSeF) is out of scope.
- The duplicate check in the command is not race-proof (two users clicking at the same second). Accepted for this scope;
  the generator is idempotent per invoice.

## Alternatives rejected

- **Columns on Order**: no snapshot, no history, one invoice per order.
- **BPF stage trigger**: implicit and re-triggered by BPF navigation.
