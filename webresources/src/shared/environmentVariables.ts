/**
 * Reading environment variables from form scripts. The query runs with the user's permissions,
 * so the user's roles need read access to Environment Variable Definition and Value.
 */

import { RecordReader } from "./xrm";

const SCHEMA_NAME_PATTERN = /^[A-Za-z0-9_]+$/;

/** Current value of an environment variable, falling back to its default value; null when it does not exist. */
export async function readEnvironmentVariable(webApi: RecordReader, schemaName: string): Promise<string | null> {
  // The name is embedded into the OData filter.
  if (!SCHEMA_NAME_PATTERN.test(schemaName)) {
    throw new Error(`Invalid environment variable name: ${schemaName}`);
  }
  const result = await webApi.retrieveMultipleRecords(
    "environmentvariabledefinition",
    `?$select=defaultvalue&$filter=schemaname eq '${schemaName}'` +
      "&$expand=environmentvariabledefinition_environmentvariablevalue($select=value)"
  );
  const definition = result.entities[0];
  if (!definition) {
    return null;
  }
  const values = (definition.environmentvariabledefinition_environmentvariablevalue ?? []) as { value?: string | null }[];
  return values[0]?.value ?? (definition.defaultvalue as string | null) ?? null;
}

/** Numeric environment variable; null when it is missing, empty or not a number. Accepts a decimal comma. */
export async function readNumberVariable(webApi: RecordReader, schemaName: string): Promise<number | null> {
  const value = await readEnvironmentVariable(webApi, schemaName);
  if (value === null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
