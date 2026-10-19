# 007. PCF control for the invoice PDF preview

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

The invoice PDF is stored in the file column `cr679_document` ([ADR-004](004-azure-function-for-invoice-pdf.md)).
On a model-driven form a file column only shows the file name with a download link, so checking an invoice means
downloading it and opening it outside the app. Users should see the document on the invoice form.

Constraints:

- The platform has no inline PDF preview for file columns on model-driven forms. The canvas *PDF viewer* control is
  experimental and needs an anonymous HTTPS URL; a Dataverse file is only reachable with the user's session.
- Access to the file must follow Dataverse security: whoever can read the invoice sees the PDF, nobody else.
- Licensing: code components need premium Power Apps licences. The Developer Plan covers them; a real deployment would too.

## Options considered

1. **Keep the default file control**: no code, but the user downloads the file every time.
2. **HTML web resource** with an iframe on the form: no build tooling, but it is a separate page that reads the form
   through `parent.Xrm`, has no theming and is harder to test.
3. **PCF code component** (React virtual control, Fluent UI 9 from the platform): bound to the record, themed like the
   app, downloads the file through the Web API with the user's session and shows it in the browser's PDF viewer.

## Decision

A PCF virtual control `RentMaszyny.InvoicePdfViewer` in `pcf/InvoicePdfViewer`, placed on the invoice form. It reads
the file column of the current record (`/api/data/v9.2/<set>(<id>)/<column>/$value`, same origin, user's session),
shows it in an iframe from an object URL, and reloads when the bound document status changes. The file column is a
control property, not hard-coded.

## Consequences

- One more build: `npm ci && npm test && npm run build` in `pcf/InvoicePdfViewer` (Jest covers the service and the hook).
- The control is published to DEV with `pac pcf push` into `RentMaszyny` and reaches TST inside the solution, like any
  component. As with web resources, the built bundle in `solutions/` is a snapshot of DEV; building the control in the
  pipeline from source is a follow-up.
- React and Fluent come from the platform (`platform-library`), so the bundle stays small, but the control must keep
  to the platform's React 16 (no hooks or packages that need React 18). `@fluentui/react-icons` was dropped for that reason.
- The preview depends on the browser's built-in PDF viewer; where it is disabled, the user still has "open" and "download".

## Alternatives rejected

- **Default file control:** does not meet the need.
- **HTML web resource:** works, but duplicates what PCF gives (binding, lifecycle, theming) and is harder to test.
