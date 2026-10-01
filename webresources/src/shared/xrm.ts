/**
 * Small helpers shared by form scripts. Keep this file free of side effects on load
 * so it can be unit-tested without a Dataverse environment.
 */

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Normalizes a GUID to lowercase without braces and validates its format.
 * Validation matters because GUIDs are embedded into FetchXML strings.
 */
export function normalizeGuid(id: string): string {
  const normalized = id.replace(/[{}]/g, "").toLowerCase();
  if (!GUID_PATTERN.test(normalized)) {
    throw new Error(`Invalid GUID: ${id}`);
  }
  return normalized;
}

/** Returns the normalized id of the first value of a lookup column, or null when the lookup is empty or not on the form. */
export function getLookupId(formContext: Xrm.FormContext, attributeName: string): string | null {
  const value = formContext.getAttribute<Xrm.Attributes.LookupAttribute>(attributeName)?.getValue();
  const first = value && value.length > 0 ? value[0] : null;
  return first?.id ? normalizeGuid(first.id) : null;
}

/** Subset of Xrm.WebApi used by the scripts. Passing it in keeps business logic testable. */
export type RecordReader = Pick<Xrm.WebApi, "retrieveRecord" | "retrieveMultipleRecords">;
