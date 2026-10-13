import { readEnvironmentVariable, readNumberVariable } from "../../src/shared/environmentVariables";
import { RecordReader } from "../../src/shared/xrm";

function api(entities: Record<string, unknown>[]) {
  const reader = { retrieveRecord: jest.fn(), retrieveMultipleRecords: jest.fn().mockResolvedValue({ entities }) };
  return reader as typeof reader & RecordReader;
}

const definition = (defaultvalue: string | null, value?: string) => ({
  defaultvalue,
  environmentvariabledefinition_environmentvariablevalue: value === undefined ? [] : [{ value }],
});

describe("readEnvironmentVariable", () => {
  it("queries the definition by schema name together with its current value", async () => {
    const reader = api([definition("14")]);
    await readEnvironmentVariable(reader, "cr679_InvoicePaymentTermDays");
    expect(reader.retrieveMultipleRecords).toHaveBeenCalledWith(
      "environmentvariabledefinition",
      expect.stringContaining("$filter=schemaname eq 'cr679_InvoicePaymentTermDays'")
    );
  });

  it("prefers the current value over the default value", async () => {
    expect(await readEnvironmentVariable(api([definition("14", "30")]), "cr679_X")).toBe("30");
  });

  it("falls back to the default value", async () => {
    expect(await readEnvironmentVariable(api([definition("14")]), "cr679_X")).toBe("14");
  });

  it("returns null for a variable that does not exist", async () => {
    expect(await readEnvironmentVariable(api([]), "cr679_X")).toBeNull();
  });

  it("rejects a name that could change the query", async () => {
    await expect(readEnvironmentVariable(api([]), "x' or 1 eq 1")).rejects.toThrow("Invalid environment variable name");
  });
});

describe("readNumberVariable", () => {
  it.each([
    ["23", 23],
    ["8,5", 8.5],
    ["0.5", 0.5],
  ])("parses %p", async (raw, expected) => {
    expect(await readNumberVariable(api([definition(raw)]), "cr679_X")).toBe(expected);
  });

  it.each(["", "  ", "two weeks"])("returns null for %p", async (raw) => {
    expect(await readNumberVariable(api([definition(raw)]), "cr679_X")).toBeNull();
  });

  it("returns null for a missing variable", async () => {
    expect(await readNumberVariable(api([]), "cr679_X")).toBeNull();
  });
});
