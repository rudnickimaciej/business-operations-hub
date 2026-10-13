import { buildOrderFilter, getOrderCustomer, getOrderNetAmount } from "../../src/shared/order";

const CUSTOMER = "AAAAAAAA-0000-0000-0000-000000000001";
const ORDER = "bbbbbbbb-0000-0000-0000-000000000002";

function reader(record: Record<string, unknown>) {
  return { retrieveRecord: jest.fn().mockResolvedValue(record), retrieveMultipleRecords: jest.fn() };
}

describe("getOrderCustomer", () => {
  it("returns the customer as a lookup value", async () => {
    const api = reader({
      _cr679_customerid_value: CUSTOMER,
      "_cr679_customerid_value@OData.Community.Display.V1.FormattedValue": "Jan Kowalski",
      "_cr679_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "contact",
    });
    const result = await getOrderCustomer(api as unknown as Xrm.WebApi, ORDER);

    expect(api.retrieveRecord).toHaveBeenCalledWith("cr679_order", ORDER, "?$select=_cr679_customerid_value");
    expect(result).toEqual({ id: CUSTOMER.toLowerCase(), name: "Jan Kowalski", entityType: "contact" });
  });

  it("returns null for an order without a customer", async () => {
    const result = await getOrderCustomer(reader({ _cr679_customerid_value: null }) as unknown as Xrm.WebApi, ORDER);
    expect(result).toBeNull();
  });
});

describe("buildOrderFilter", () => {
  it("filters orders by the normalized customer id", () => {
    expect(buildOrderFilter(`{${CUSTOMER}}`)).toBe(
      "<filter type='and'><condition attribute='cr679_customerid' operator='eq' value='aaaaaaaa-0000-0000-0000-000000000001' /></filter>"
    );
  });

  it("rejects a malformed id instead of embedding it into FetchXML", () => {
    expect(() => buildOrderFilter("' or 1=1")).toThrow("Invalid GUID");
  });
});

describe("getOrderNetAmount", () => {
  function items(entities: Record<string, unknown>[]) {
    return { retrieveRecord: jest.fn(), retrieveMultipleRecords: jest.fn().mockResolvedValue({ entities }) };
  }

  it("sums the prices of the order's active items", async () => {
    const api = items([{ cr679_itemprice: 150.1 }, { cr679_itemprice: 249.9 }]);
    expect(await getOrderNetAmount(api as unknown as Xrm.WebApi, `{${ORDER.toUpperCase()}}`)).toBe(400);
    expect(api.retrieveMultipleRecords).toHaveBeenCalledWith(
      "cr679_orderitem",
      `?$select=cr679_itemprice&$filter=_cr679_orderid_value eq ${ORDER} and statecode eq 0`
    );
  });

  it("counts an item without a price as 0 and rounds to grosze", async () => {
    const api = items([{ cr679_itemprice: null }, { cr679_itemprice: 0.1 }, { cr679_itemprice: 0.2 }]);
    expect(await getOrderNetAmount(api as unknown as Xrm.WebApi, ORDER)).toBe(0.3);
  });

  it("returns 0 for an order without items", async () => {
    expect(await getOrderNetAmount(items([]) as unknown as Xrm.WebApi, ORDER)).toBe(0);
  });
});
