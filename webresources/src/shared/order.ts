import { Order, OrderItem, StateCode } from "./schema";
import { normalizeGuid, RecordReader } from "./xrm";

/** Customer of an order, in the shape of a lookup value. */
export interface CustomerReference {
  id: string;
  name: string;
  entityType: string;
}

const LOOKUP_VALUE = `_${Order.fields.customer}_value`;

/**
 * Reads the customer (account or contact) of an order.
 * Returns null when the order has no customer.
 */
export async function getOrderCustomer(webApi: RecordReader, orderId: string): Promise<CustomerReference | null> {
  const order = await webApi.retrieveRecord(Order.entity, orderId, `?$select=${LOOKUP_VALUE}`);
  const id = order[LOOKUP_VALUE];
  if (typeof id !== "string" || id === "") {
    return null;
  }
  return {
    id: normalizeGuid(id),
    name: order[`${LOOKUP_VALUE}@OData.Community.Display.V1.FormattedValue`] ?? "",
    entityType: order[`${LOOKUP_VALUE}@Microsoft.Dynamics.CRM.lookuplogicalname`],
  };
}

/** FetchXML filter for the Order lookup: only orders of the given customer. */
export function buildOrderFilter(customerId: string): string {
  return `<filter type='and'><condition attribute='${Order.fields.customer}' operator='eq' value='${normalizeGuid(customerId)}' /></filter>`;
}

/**
 * Net amount of an order: the sum of its active items' prices, rounded to grosze.
 * An item without a price counts as 0, the same as in the invoice generator.
 */
export async function getOrderNetAmount(webApi: RecordReader, orderId: string): Promise<number> {
  const f = OrderItem.fields;
  const result = await webApi.retrieveMultipleRecords(
    OrderItem.entity,
    `?$select=${f.itemPrice}&$filter=_${f.order}_value eq ${normalizeGuid(orderId)} and ${f.stateCode} eq ${StateCode.Active}`
  );
  const total = result.entities.reduce((sum, item) => sum + (Number(item[f.itemPrice]) || 0), 0);
  return Math.round(total * 100) / 100;
}
