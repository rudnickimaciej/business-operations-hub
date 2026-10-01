import { Order, OrderItem, StateCode } from "../shared/schema";
import { normalizeGuid, RecordReader } from "../shared/xrm";

export type AvailabilityResult =
  | { status: "available" }
  | { status: "conflict"; conflictingOrderId: string; sameOrder: boolean };

/**
 * FetchXML returning at most one active order that overlaps [startIso, endIso]
 * and has an active order item for the given machine.
 * Overlap rule: other.end >= start AND other.start <= end (touching dates count as a conflict).
 */
export function buildConflictFetchXml(machineId: string, startIso: string, endIso: string): string {
  const machine = normalizeGuid(machineId);
  return [
    "<fetch top='1'>",
    `<entity name='${Order.entity}'>`,
    `<attribute name='${Order.fields.id}' />`,
    "<filter type='and'>",
    `<condition attribute='${Order.fields.stateCode}' operator='eq' value='${StateCode.Active}' />`,
    `<condition attribute='${Order.fields.endDate}' operator='ge' value='${startIso}' />`,
    `<condition attribute='${Order.fields.startDate}' operator='le' value='${endIso}' />`,
    "</filter>",
    `<link-entity name='${OrderItem.entity}' from='${OrderItem.fields.order}' to='${Order.fields.id}' link-type='inner'>`,
    "<filter type='and'>",
    `<condition attribute='${OrderItem.fields.stateCode}' operator='eq' value='${StateCode.Active}' />`,
    `<condition attribute='${OrderItem.fields.machine}' operator='eq' value='${machine}' />`,
    "</filter>",
    "</link-entity>",
    "</entity>",
    "</fetch>",
  ].join("");
}

/**
 * Checks whether the machine is already allocated to an active order overlapping the rental period
 * of the given order. An order without start or end date cannot conflict.
 */
export async function checkMachineAvailability(
  webApi: RecordReader,
  machineId: string,
  orderId: string
): Promise<AvailabilityResult> {
  const order = await webApi.retrieveRecord(
    Order.entity,
    orderId,
    `?$select=${Order.fields.startDate},${Order.fields.endDate}`
  );
  const start = order[Order.fields.startDate];
  const end = order[Order.fields.endDate];
  if (typeof start !== "string" || typeof end !== "string") {
    return { status: "available" };
  }

  const fetchXml = buildConflictFetchXml(
    machineId,
    new Date(start).toISOString(),
    new Date(end).toISOString()
  );
  const result = await webApi.retrieveMultipleRecords(
    Order.entity,
    `?fetchXml=${encodeURIComponent(fetchXml)}`
  );
  if (result.entities.length === 0) {
    return { status: "available" };
  }

  const conflictingOrderId = normalizeGuid(String(result.entities[0][Order.fields.id]));
  return {
    status: "conflict",
    conflictingOrderId,
    sameOrder: conflictingOrderId === normalizeGuid(orderId),
  };
}
