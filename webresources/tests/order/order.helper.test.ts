import { buildInvoice, hasInvoice, InvoiceIssueError, InvoiceWriter, issueInvoice, toDateOnly } from "../../src/order/order.helper";

const ORDER_ID = "bbbbbbbb-0000-0000-0000-000000000002";
const ACCOUNT_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const CONTACT_ID = "cccccccc-0000-0000-0000-000000000003";
const NOW = new Date(2026, 9, 16, 14, 30);

interface Scenario {
  invoices?: Record<string, unknown>[];
  customer?: { id: string; type: string } | null;
  prices?: (number | null)[];
  variables?: Record<string, string | undefined>;
  account?: Record<string, unknown>;
  contact?: Record<string, unknown>;
}

function webApi(scenario: Scenario = {}) {
  const customer = scenario.customer === undefined ? { id: ACCOUNT_ID, type: "account" } : scenario.customer;
  const variables = scenario.variables ?? { cr679_InvoiceVatRate: "23", cr679_InvoicePaymentTermDays: "14" };
  const api = {
    retrieveRecord: jest.fn((entity: string) => {
      if (entity === "cr679_order") {
        return Promise.resolve({
          _cr679_customerid_value: customer?.id ?? null,
          "_cr679_customerid_value@OData.Community.Display.V1.FormattedValue": "Budex",
          "_cr679_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": customer?.type,
        });
      }
      if (entity === "account") {
        return Promise.resolve(scenario.account ?? { name: "Budex Sp. z o.o.", address1_composite: "ul. Polna 1\r\n00-001 Warszawa", cr679_nip: "5250000000" });
      }
      return Promise.resolve(scenario.contact ?? { fullname: "Jan Kowalski", address1_composite: "ul. Leśna 2\r\n30-001 Kraków" });
    }),
    retrieveMultipleRecords: jest.fn((entity: string, options: string) => {
      if (entity === "cr679_invoice") {
        return Promise.resolve({ entities: scenario.invoices ?? [] });
      }
      if (entity === "cr679_orderitem") {
        return Promise.resolve({ entities: (scenario.prices ?? [150, 250]).map((price) => ({ cr679_itemprice: price })) });
      }
      const name = /schemaname eq '([^']+)'/.exec(options)?.[1] ?? "";
      const value = variables[name];
      return Promise.resolve({
        entities: value === undefined ? [] : [{ defaultvalue: value, environmentvariabledefinition_environmentvariablevalue: [] }],
      });
    }),
    createRecord: jest.fn(() => Promise.resolve({ entityType: "cr679_invoice", id: "dddddddd-0000-0000-0000-000000000004" })),
  };
  return api as typeof api & InvoiceWriter;
}

async function issueError(scenario: Scenario): Promise<string> {
  const error = await buildInvoice(webApi(scenario), ORDER_ID, NOW).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(InvoiceIssueError);
  return (error as Error).message;
}

describe("toDateOnly", () => {
  it("formats the local date", () => {
    expect(toDateOnly(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("hasInvoice", () => {
  it("looks for any invoice of the order", async () => {
    const api = webApi({ invoices: [{ cr679_invoiceid: "x" }] });
    expect(await hasInvoice(api, `{${ORDER_ID.toUpperCase()}}`)).toBe(true);
    expect(api.retrieveMultipleRecords).toHaveBeenCalledWith(
      "cr679_invoice",
      `?$select=cr679_invoiceid&$filter=_cr679_orderid_value eq ${ORDER_ID}&$top=1`
    );
  });
});

describe("buildInvoice", () => {
  it("builds the invoice of a company order", async () => {
    const invoice = await buildInvoice(webApi(), ORDER_ID, NOW);
    expect(invoice).toEqual({
      "cr679_orderid@odata.bind": `/cr679_orders(${ORDER_ID})`,
      "cr679_customerid_account@odata.bind": `/accounts(${ACCOUNT_ID})`,
      cr679_customername: "Budex Sp. z o.o.",
      cr679_customeraddress: "ul. Polna 1, 00-001 Warszawa",
      cr679_customernip: "5250000000",
      cr679_issuedate: "2026-10-16",
      cr679_duedate: "2026-10-30",
      cr679_netamount: 400,
      cr679_vatrate: 23,
      cr679_requestedon: NOW.toISOString(),
    });
  });

  it("builds the invoice of a private person without NIP", async () => {
    const invoice = await buildInvoice(webApi({ customer: { id: CONTACT_ID, type: "contact" } }), ORDER_ID, NOW);
    expect(invoice["cr679_customerid_contact@odata.bind"]).toBe(`/contacts(${CONTACT_ID})`);
    expect(invoice.cr679_customername).toBe("Jan Kowalski");
    expect(invoice.cr679_customernip).toBeNull();
  });

  it("refuses a second invoice for the same order", async () => {
    expect(await issueError({ invoices: [{ cr679_invoiceid: "x" }] })).toBe("To zamówienie ma już fakturę.");
  });

  it("refuses an order without a customer", async () => {
    expect(await issueError({ customer: null })).toBe("Zamówienie nie ma klienta.");
  });

  it.each([[[]], [[null, 0]]])("refuses an order without priced items (%p)", async (prices) => {
    expect(await issueError({ prices })).toBe("Zamówienie nie ma pozycji z ceną.");
  });

  it("refuses when the VAT rate or payment term is not configured", async () => {
    expect(await issueError({ variables: { cr679_InvoiceVatRate: "23" } })).toContain("Brak konfiguracji");
  });

  it("refuses a customer without an address", async () => {
    expect(await issueError({ account: { name: "Budex", address1_composite: null } })).toContain("adresu");
  });

  it("lets technical errors through untouched", async () => {
    const api = webApi();
    api.retrieveMultipleRecords.mockRejectedValueOnce(new Error("503"));
    await expect(buildInvoice(api, ORDER_ID, NOW)).rejects.toThrow("503");
  });
});

describe("issueInvoice", () => {
  it("creates the invoice and returns its id", async () => {
    const api = webApi();
    expect(await issueInvoice(api, ORDER_ID, NOW)).toBe("dddddddd-0000-0000-0000-000000000004");
    expect(api.createRecord).toHaveBeenCalledWith("cr679_invoice", expect.objectContaining({ cr679_netamount: 400 }));
  });

  it("creates nothing when the order is not ready", async () => {
    const api = webApi({ invoices: [{ cr679_invoiceid: "x" }] });
    await expect(issueInvoice(api, ORDER_ID, NOW)).rejects.toBeInstanceOf(InvoiceIssueError);
    expect(api.createRecord).not.toHaveBeenCalled();
  });
});
