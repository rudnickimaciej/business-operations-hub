/**
 * Command bar of the Order (cr679_order) main form.
 *
 * Button "Wystaw fakturę": creates the invoice for a completed order and opens it; the PDF is generated in the
 * background (status Requested). The button is enabled only for a saved, completed order without an invoice.
 *
 * Ribbon registration (Entities/cr679_order/RibbonDiff.xml), library cr679_orderribbon:
 *   command      -> RentMaszyny.order.ribbon.createInvoice     (CrmParameter: PrimaryControl)
 *   enable rule  -> RentMaszyny.order.ribbon.canCreateInvoice  (CrmParameter: PrimaryControl)
 *
 * UX only: Dataverse does not yet prevent a second invoice for the same order.
 */

import { Invoice, Order, OrderStatus } from "../shared/schema";
import { hasInvoice, InvoiceIssueError, issueInvoice } from "./order.helper";

const FORM_TYPE_CREATE = 1;

function isCompleted(formContext: Xrm.FormContext): boolean {
  return formContext.getAttribute<Xrm.Attributes.OptionSetAttribute>(Order.fields.status)?.getValue() === OrderStatus.Completed;
}

function orderId(formContext: Xrm.FormContext): string {
  return formContext.data.entity.getId();
}

/** Enable rule. An unsaved order has no id yet, and a failed check keeps the button disabled. */
export async function canCreateInvoice(formContext: Xrm.FormContext): Promise<boolean> {
  if (formContext.ui.getFormType() === FORM_TYPE_CREATE || !isCompleted(formContext)) {
    return false;
  }
  try {
    return !(await hasInvoice(Xrm.WebApi, orderId(formContext)));
  } catch (error: unknown) {
    console.error("[RentMaszyny.order.ribbon] Checking the order's invoice failed", error);
    return false;
  }
}

export async function createInvoice(formContext: Xrm.FormContext): Promise<void> {
  Xrm.Utility.showProgressIndicator("Wystawianie faktury…");
  let invoiceId: string;
  try {
    // The invoice is built from saved data, so unsaved changes (e.g. the status) are saved first.
    if (formContext.data.entity.getIsDirty()) {
      await formContext.data.save();
    }
    if (!isCompleted(formContext)) {
      throw new InvoiceIssueError("Fakturę można wystawić tylko dla zakończonego zamówienia.");
    }
    invoiceId = await issueInvoice(Xrm.WebApi, orderId(formContext));
  } catch (error: unknown) {
    Xrm.Utility.closeProgressIndicator();
    console.error("[RentMaszyny.order.ribbon] Issuing the invoice failed", error);
    const text =
      error instanceof InvoiceIssueError
        ? error.message
        : "Nie udało się wystawić faktury. Spróbuj ponownie, a jeśli błąd się powtórzy, skontaktuj się z administratorem.";
    await Xrm.Navigation.openAlertDialog({ title: "Wystaw fakturę", text });
    return;
  }

  Xrm.Utility.closeProgressIndicator();
  formContext.ui.refreshRibbon();
  await Xrm.Navigation.openForm({ entityName: Invoice.entity, entityId: invoiceId });
}
