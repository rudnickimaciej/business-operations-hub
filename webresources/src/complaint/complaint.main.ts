/**
 * Main form of Complaint (cr679_complaint).
 *
 * Keeps the customer and the order of a complaint consistent (ADR-006):
 * - the Order lookup shows only orders of the selected customer;
 * - selecting an order fills an empty customer with the order's customer;
 * - an order of another customer is flagged on the Order field, which blocks saving;
 * - changing the customer clears an order that belongs to someone else.
 *
 * Form registration: library cr679_complaintmain,
 *   OnLoad -> RentMaszyny.complaint.main.onLoad (pass execution context: yes)
 *
 * This is UX only, not enforcement: records created outside this form (import, API, flows) are not checked.
 */

import { Complaint, Order } from "../shared/schema";
import { getLookupId } from "../shared/xrm";
import { buildOrderFilter, getOrderCustomer } from "./orderCustomer";

const ORDER_NOTIFICATION_ID = "cr679_complaint_order_customer";
const FORM_NOTIFICATION_ID = "cr679_complaint_order_check";

export function onLoad(executionContext: Xrm.Events.EventContext): void {
  const formContext = executionContext.getFormContext();
  formContext.getControl<Xrm.Controls.LookupControl>(Complaint.fields.order)?.addPreSearch(filterOrders);
  formContext.getAttribute(Complaint.fields.customer)?.addOnChange(onCustomerChange);
  formContext.getAttribute(Complaint.fields.order)?.addOnChange(onOrderChange);
}

/** PreSearch handler of the Order lookup. Without a customer all orders are offered. */
export function filterOrders(executionContext: Xrm.Events.EventContext): void {
  const formContext = executionContext.getFormContext();
  const customerId = getLookupId(formContext, Complaint.fields.customer);
  if (customerId) {
    formContext
      .getControl<Xrm.Controls.LookupControl>(Complaint.fields.order)
      ?.addCustomFilter(buildOrderFilter(customerId), Order.entity);
  }
}

export async function onOrderChange(executionContext: Xrm.Events.EventContext): Promise<void> {
  const formContext = executionContext.getFormContext();
  const orderControl = formContext.getControl<Xrm.Controls.LookupControl>(Complaint.fields.order);
  orderControl?.clearNotification(ORDER_NOTIFICATION_ID);
  formContext.ui.clearFormNotification(FORM_NOTIFICATION_ID);

  const orderId = getLookupId(formContext, Complaint.fields.order);
  if (!orderId) {
    return;
  }

  try {
    const orderCustomer = await getOrderCustomer(Xrm.WebApi, orderId);
    if (!orderCustomer || getLookupId(formContext, Complaint.fields.order) !== orderId) {
      return; // order without a customer, or the user changed the order in the meantime
    }
    const customerId = getLookupId(formContext, Complaint.fields.customer);
    if (!customerId) {
      formContext.getAttribute<Xrm.Attributes.LookupAttribute>(Complaint.fields.customer)?.setValue([orderCustomer]);
    } else if (customerId !== orderCustomer.id) {
      orderControl?.setNotification("To zamówienie należy do innego klienta.", ORDER_NOTIFICATION_ID);
    }
  } catch (error: unknown) {
    reportCheckFailure(formContext, error);
  }
}

export async function onCustomerChange(executionContext: Xrm.Events.EventContext): Promise<void> {
  const formContext = executionContext.getFormContext();
  formContext.getControl<Xrm.Controls.LookupControl>(Complaint.fields.order)?.clearNotification(ORDER_NOTIFICATION_ID);
  formContext.ui.clearFormNotification(FORM_NOTIFICATION_ID);

  const orderId = getLookupId(formContext, Complaint.fields.order);
  const customerId = getLookupId(formContext, Complaint.fields.customer);
  if (!orderId || !customerId) {
    return;
  }

  try {
    const orderCustomer = await getOrderCustomer(Xrm.WebApi, orderId);
    if (orderCustomer && orderCustomer.id !== getLookupId(formContext, Complaint.fields.customer)) {
      formContext.getAttribute<Xrm.Attributes.LookupAttribute>(Complaint.fields.order)?.setValue(null);
      formContext.ui.setFormNotification(
        "Usunięto zamówienie, ponieważ należy do innego klienta.",
        "INFO",
        FORM_NOTIFICATION_ID
      );
    }
  } catch (error: unknown) {
    reportCheckFailure(formContext, error);
  }
}

// Fail open: an unavailable Web API must not stop users from working.
function reportCheckFailure(formContext: Xrm.FormContext, error: unknown): void {
  console.error("[RentMaszyny.complaint.main] Order customer check failed", error);
  formContext.ui.setFormNotification(
    "Nie udało się sprawdzić, czy zamówienie należy do klienta.",
    "WARNING",
    FORM_NOTIFICATION_ID
  );
}
