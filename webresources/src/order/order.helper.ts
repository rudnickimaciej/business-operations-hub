/**
 * Issuing the invoice for an order: the checks and the invoice row, built from the same helpers the invoice form uses
 * (settings from environment variables, buyer snapshot, order total), so the rules live in one place.
 */

import { getCustomerSnapshot, readInvoiceSettings } from "../invoice/invoice.helper";
import { addDays, today } from "../shared/dates";
import { getOrderCustomer, getOrderNetAmount } from "../shared/order";
import { Account, Contact, Invoice, Order } from "../shared/schema";
import { normalizeGuid, RecordReader } from "../shared/xrm";

/** Subset of Xrm.WebApi needed to issue an invoice. */
export type InvoiceWriter = RecordReader & Pick<Xrm.WebApi, "createRecord">;

/** A reason the invoice cannot be issued; the message is shown to the user as is. */
export class InvoiceIssueError extends Error {}

const CUSTOMER_ENTITY_SETS: Record<string, string> = {
  [Account.entity]: "accounts",
  [Contact.entity]: "contacts",
};

/** True when the order already has an invoice. One invoice per order for now. */
export async function hasInvoice(webApi: RecordReader, orderId: string): Promise<boolean> {
  const result = await webApi.retrieveMultipleRecords(
    Invoice.entity,
    `?$select=${Invoice.fields.id}&$filter=_${Invoice.fields.order}_value eq ${normalizeGuid(orderId)}&$top=1`
  );
  return result.entities.length > 0;
}

/** Date-only column value (yyyy-MM-dd) for a local date. */
export function toDateOnly(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The invoice row for an order, ready for createRecord. Throws InvoiceIssueError when the order is not ready.
 * Status Requested is the column default; cr679_requestedon starts the PDF generation.
 */
export async function buildInvoice(webApi: RecordReader, orderId: string, now: Date = new Date()): Promise<Record<string, unknown>> {
  const id = normalizeGuid(orderId);
  if (await hasInvoice(webApi, id)) {
    throw new InvoiceIssueError("To zamówienie ma już fakturę.");
  }

  const [customer, netAmount, settings] = await Promise.all([
    getOrderCustomer(webApi, id),
    getOrderNetAmount(webApi, id),
    readInvoiceSettings(webApi),
  ]);
  const entitySet = customer ? CUSTOMER_ENTITY_SETS[customer.entityType] : undefined;
  if (!customer || !entitySet) {
    throw new InvoiceIssueError("Zamówienie nie ma klienta.");
  }
  if (netAmount <= 0) {
    throw new InvoiceIssueError("Zamówienie nie ma pozycji z ceną.");
  }
  if (settings.vatRate === null || settings.paymentTermDays === null) {
    throw new InvoiceIssueError("Brak konfiguracji stawki VAT lub terminu płatności. Skontaktuj się z administratorem.");
  }

  const buyer = await getCustomerSnapshot(webApi, customer);
  if (!buyer?.name || !buyer.address) {
    throw new InvoiceIssueError("Klient nie ma uzupełnionej nazwy lub adresu. Uzupełnij je na karcie klienta.");
  }

  const issueDate = today(now);
  const f = Invoice.fields;
  return {
    [`${f.order}@odata.bind`]: `/${Order.entity}s(${id})`,
    [`${f.customer}_${customer.entityType}@odata.bind`]: `/${entitySet}(${customer.id})`,
    [f.customerName]: buyer.name,
    [f.customerAddress]: buyer.address,
    [f.customerNip]: buyer.nip,
    [f.issueDate]: toDateOnly(issueDate),
    [f.dueDate]: toDateOnly(addDays(issueDate, settings.paymentTermDays)),
    [f.netAmount]: netAmount,
    [f.vatRate]: settings.vatRate,
    [f.requestedOn]: now.toISOString(),
  };
}

/** Creates the invoice for an order and returns its id. */
export async function issueInvoice(webApi: InvoiceWriter, orderId: string, now: Date = new Date()): Promise<string> {
  const invoice = await buildInvoice(webApi, orderId, now);
  const created = await webApi.createRecord(Invoice.entity, invoice);
  return created.id;
}
