/**
 * Helpers of the invoice main form, kept free of form state so they can be unit-tested.
 *
 * Settings for the defaults of a new invoice: the VAT rate and the payment term come from environment variables,
 * never from constants.
 *
 * Buyer data copied from the invoice customer (account or contact). The invoice keeps a snapshot,
 * so later changes to the customer do not alter issued invoices.
 */

import { readNumberVariable } from "../shared/environmentVariables";
import { Account, Contact, EnvironmentVariables } from "../shared/schema";
import { normalizeGuid, RecordReader } from "../shared/xrm";

export interface InvoiceSettings {
  vatRate: number | null;
  paymentTermDays: number | null;
}

/** Reads the VAT rate and the payment term. A missing or non-numeric variable comes back as null. */
export async function readInvoiceSettings(webApi: RecordReader): Promise<InvoiceSettings> {
  const [vatRate, paymentTermDays] = await Promise.all([
    readNumberVariable(webApi, EnvironmentVariables.invoiceVatRate),
    readNumberVariable(webApi, EnvironmentVariables.invoicePaymentTermDays),
  ]);
  return { vatRate, paymentTermDays };
}

export interface CustomerSnapshot {
  name: string | null;
  address: string | null;
  nip: string | null;
}

/** The composite address has one line per part; the invoice column is single-line text. */
export function toSingleLine(address: string | null | undefined): string | null {
  const parts = (address ?? "").split(/\r?\n/).map((part) => part.trim()).filter((part) => part !== "");
  return parts.length > 0 ? parts.join(", ") : null;
}

export async function getCustomerSnapshot(webApi: RecordReader, customer: Xrm.LookupValue): Promise<CustomerSnapshot | null> {
  const id = normalizeGuid(customer.id);
  if (customer.entityType === Account.entity) {
    const f = Account.fields;
    const account = await webApi.retrieveRecord(Account.entity, id, `?$select=${f.name},${f.address},${f.nip}`);
    return {
      name: (account[f.name] as string | null) ?? null,
      address: toSingleLine(account[f.address] as string | null),
      nip: (account[f.nip] as string | null) ?? null,
    };
  }
  if (customer.entityType === Contact.entity) {
    const f = Contact.fields;
    const contact = await webApi.retrieveRecord(Contact.entity, id, `?$select=${f.fullName},${f.address}`);
    // A private person has no NIP.
    return { name: (contact[f.fullName] as string | null) ?? null, address: toSingleLine(contact[f.address] as string | null), nip: null };
  }
  return null;
}
