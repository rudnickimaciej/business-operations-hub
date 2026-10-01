# Invoicing

Issues an invoice for a rental order and attaches it as a PDF. Decisions: [ADR-003](decisions/003-invoice-as-separate-table.md),
[ADR-004](decisions/004-azure-function-for-invoice-pdf.md). Sending the invoice by e-mail is out of scope for now.

Every customer gets an invoice, companies (`account`) and private persons (`contact`) alike; the command behaves the same for both.
A private person's invoice has no buyer NIP.

## Flow

```text
Order form: "Wystaw fakturę" (Power Fx command)
  └─ creates cr679_invoice: status Requested, snapshot of customer data and amounts, cr679_requestedon = now
       └─ Dataverse Service Endpoint (async step) ──> Service Bus queue "invoice-requests"
            └─ Azure Function InvoiceGenerator
                 1. read invoice; status not Requested/Failed → complete message, do nothing (idempotency)
                 2. status = Generating
                 3. read order items, render PDF (QuestPDF), upload to cr679_document
                 4. status = Generated, cr679_generatedon = now
                 on error: retry (Service Bus); last attempt → status Failed, cr679_errormessage, cr679_applicationlog
Invoice form: "Ponów generowanie" (visible when Failed) → status Requested, cr679_requestedon = now
```

## Data model

### `cr679_invoice` (Faktura / Faktury), user-owned

Display names are Polish (the app's users are Polish); schema names are English.

| Schema name | Display name | Type | Notes |
|---|---|---|---|
| `cr679_autonumber` | Numer faktury | Autonumber (primary name) | `FV-{SEQNUM:5}` |
| `cr679_orderid` | Zamówienie | Lookup → `cr679_order` | Required. Relationship behaviour: restrict delete of the order. |
| `cr679_customerid` | Klient | Customer (`account` or `contact`) | Required. Deleting the customer keeps the invoice (remove link). ADR-005 |
| `cr679_customername` | Nabywca – nazwa | Text (200) | Snapshot: account `name` / contact `fullname` |
| `cr679_customernip` | Nabywca – NIP | Text (20) | Snapshot: account `cr679_nip`; empty for a contact |
| `cr679_customeraddress` | Nabywca – adres | Text (500) | Snapshot: `address1_composite` |
| `cr679_issuedate` | Data wystawienia | Date only | |
| `cr679_duedate` | Termin płatności | Date only | Issue date + `cr679_InvoicePaymentTermDays` |
| `cr679_netamount` | Kwota netto | Currency | Copied from the order |
| `cr679_vatrate` | Stawka VAT (%) | Decimal | From environment variable `cr679_InvoiceVatRate` |
| `cr679_vatamount` | Kwota VAT | Currency, calculated | `cr679_netamount * cr679_vatrate / 100` |
| `cr679_grossamount` | Kwota brutto | Currency, calculated | `cr679_netamount + cr679_vatamount` |
| `cr679_documentstatus` | Status dokumentu | Choice | Zlecona (Requested), W trakcie generowania (Generating), Wygenerowana (Generated), Błąd (Failed) |
| `cr679_requestedon` | Data zlecenia | Date and time | Set only by the issue/retry commands; the queue trigger filters on it |
| `cr679_generatedon` | Data wygenerowania | Date and time | |
| `cr679_document` | Dokument PDF | File (10 MB) | Invoice PDF |
| `cr679_errormessage` | Komunikat błędu | Multiline text | Last error, user-readable |

Ownership is user/team, because table ownership cannot be changed later and the security model is not designed yet.

### `cr679_applicationlog` (Application Log), organization-owned

Shared technical log for flows, the Azure Function and scripts. `createdon` / `createdby` are not duplicated.

| Column | Type |
|---|---|
| `cr679_name` | Text (primary, short summary) |
| `cr679_correlationid` | Text (e.g. Service Bus message id or flow run id) |
| `cr679_source` | Text (e.g. `InvoiceGenerator`, flow name) |
| `cr679_operation` | Text |
| `cr679_severity` | Choice: Information, Warning, Error, Critical |
| `cr679_message` | Multiline text |
| `cr679_details` | Multiline text (exception, stack trace) |
| `cr679_errorcode` | Text |
| `cr679_tablename`, `cr679_recordid` | Text (affected record) |

## Configuration

| Item | Kind | DEV / TST value |
|---|---|---|
| `cr679_InvoiceVatRate` | Environment variable (decimal) | 23 |
| `cr679_InvoicePaymentTermDays` | Environment variable (number) | 14 |
| Service Bus queue + SAS key | Service Endpoint | per environment, set after import |

## What can go wrong

| Symptom | Cause |
|---|---|
| Invoice stays *Requested* | Service Endpoint not configured in this environment, or the async step is disabled (check System Jobs) |
| Invoice *Failed* | Message in `cr679_errormessage`; details in `cr679_applicationlog` and Application Insights |
| Messages in the dead-letter queue | Repeated failure; the invoice is *Failed*; fix the cause and use "Ponów generowanie" |
| Amount on the invoice differs from items | Order total not recalculated before issuing (see ADR-003, consequences) |
