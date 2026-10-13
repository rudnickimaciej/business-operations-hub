import { copyCustomerData, onCustomerChange, onLoad } from "../../src/invoice/invoice.main";
import { getCustomerSnapshot, toSingleLine } from "../../src/invoice/invoice.helper";
import { RecordReader } from "../../src/shared/xrm";
import { formContext } from "../mocks/xrmMocks";

const ACCOUNT_ID = "11111111-1111-1111-1111-111111111111";
const CONTACT_ID = "22222222-2222-2222-2222-222222222222";

function textAttribute(value: string | null = null) {
  let current = value;
  return {
    getValue: jest.fn(() => current),
    setValue: jest.fn((next: string | null) => {
      current = next;
    }),
  };
}

function customerAttribute(entityType: string | null, id = ACCOUNT_ID) {
  let current: Xrm.LookupValue[] | null = entityType ? [{ id: `{${id.toUpperCase()}}`, name: "x", entityType }] : null;
  return {
    getValue: jest.fn(() => current),
    setValue: jest.fn((next: Xrm.LookupValue[] | null) => {
      current = next;
    }),
  };
}

function api(record: Record<string, unknown> | Error) {
  const retrieveRecord = record instanceof Error ? jest.fn().mockRejectedValue(record) : jest.fn().mockResolvedValue(record);
  const reader = { retrieveRecord, retrieveMultipleRecords: jest.fn() };
  return reader as typeof reader & RecordReader;
}

function invoiceForm(customer: ReturnType<typeof customerAttribute>, buyer: { name?: string; address?: string; nip?: string } = {}) {
  const name = textAttribute(buyer.name ?? null);
  const address = textAttribute(buyer.address ?? null);
  const nip = textAttribute(buyer.nip ?? null);
  const form = formContext({
    cr679_customerid: customer,
    cr679_customername: name,
    cr679_customeraddress: address,
    cr679_customernip: nip,
  });
  return { form, ctx: form as unknown as Xrm.FormContext, name, address, nip };
}

const account = { name: "Budex Sp. z o.o.", address1_composite: "ul. Polna 1\r\n00-001 Warszawa\r\nPolska", cr679_nip: "5250000000" };
const contact = { fullname: "Jan Kowalski", address1_composite: "ul. Leśna 2\r\n30-001 Kraków" };

describe("toSingleLine", () => {
  it("joins the lines of a composite address", () => {
    expect(toSingleLine("ul. Polna 1\r\n00-001 Warszawa\n Polska ")).toBe("ul. Polna 1, 00-001 Warszawa, Polska");
  });

  it.each([null, undefined, "", "\r\n  \r\n"])("returns null for an empty address (%p)", (value) => {
    expect(toSingleLine(value)).toBeNull();
  });
});

describe("getCustomerSnapshot", () => {
  it("reads name, address and NIP of an account", async () => {
    const reader = api(account);
    const snapshot = await getCustomerSnapshot(reader, { id: `{${ACCOUNT_ID}}`, entityType: "account" });
    expect(reader.retrieveRecord).toHaveBeenCalledWith("account", ACCOUNT_ID, "?$select=name,address1_composite,cr679_nip");
    expect(snapshot).toEqual({ name: "Budex Sp. z o.o.", address: "ul. Polna 1, 00-001 Warszawa, Polska", nip: "5250000000" });
  });

  it("reads a contact without NIP", async () => {
    const reader = api(contact);
    const snapshot = await getCustomerSnapshot(reader, { id: CONTACT_ID, entityType: "contact" });
    expect(reader.retrieveRecord).toHaveBeenCalledWith("contact", CONTACT_ID, "?$select=fullname,address1_composite");
    expect(snapshot).toEqual({ name: "Jan Kowalski", address: "ul. Leśna 2, 30-001 Kraków", nip: null });
  });

  it("ignores other entity types", async () => {
    const reader = api(account);
    expect(await getCustomerSnapshot(reader, { id: ACCOUNT_ID, entityType: "systemuser" })).toBeNull();
    expect(reader.retrieveRecord).not.toHaveBeenCalled();
  });
});

describe("copyCustomerData", () => {
  it("copies the account data to the buyer fields, replacing old values", async () => {
    const { ctx, name, address, nip, form } = invoiceForm(customerAttribute("account"), { name: "Old", address: "Old", nip: "Old" });
    await copyCustomerData(ctx, api(account));
    expect(name.getValue()).toBe("Budex Sp. z o.o.");
    expect(address.getValue()).toBe("ul. Polna 1, 00-001 Warszawa, Polska");
    expect(nip.getValue()).toBe("5250000000");
    expect(form.ui.setFormNotification).not.toHaveBeenCalled();
  });

  it("clears the NIP when the customer becomes a private person", async () => {
    const { ctx, nip } = invoiceForm(customerAttribute("contact", CONTACT_ID), { nip: "5250000000" });
    await copyCustomerData(ctx, api(contact));
    expect(nip.getValue()).toBeNull();
  });

  it("leaves the buyer fields alone when the customer is cleared", async () => {
    const reader = api(account);
    const { ctx, name } = invoiceForm(customerAttribute(null), { name: "Budex" });
    await copyCustomerData(ctx, reader);
    expect(name.getValue()).toBe("Budex");
    expect(reader.retrieveRecord).not.toHaveBeenCalled();
  });

  it("warns when the customer has no address", async () => {
    const { ctx, form } = invoiceForm(customerAttribute("contact", CONTACT_ID));
    await copyCustomerData(ctx, api({ fullname: "Jan Kowalski", address1_composite: null }));
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.stringContaining("adresu"), "WARNING", "cr679_invoice_customer");
  });

  it("fails open with a warning when the customer cannot be read", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { ctx, name, form } = invoiceForm(customerAttribute("account"), { name: "Budex" });
    await expect(copyCustomerData(ctx, api(new Error("403")))).resolves.toBeUndefined();
    expect(name.getValue()).toBe("Budex");
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.stringContaining("Nie udało się pobrać"), "WARNING", "cr679_invoice_customer");
    consoleError.mockRestore();
  });

  it("drops a late answer when the user picked another customer meanwhile", async () => {
    const customer = customerAttribute("account");
    const { ctx, name } = invoiceForm(customer);
    const reader = api(account);
    reader.retrieveRecord.mockImplementation(async () => {
      customer.setValue([{ id: CONTACT_ID, name: "y", entityType: "contact" }]);
      return account;
    });
    await copyCustomerData(ctx, reader);
    expect(name.getValue()).toBeNull();
  });
});

describe("onLoad buyer data", () => {
  function loadForm(formType: number, buyerName?: string) {
    const customer = { ...customerAttribute("account"), addOnChange: jest.fn() };
    const invoice = invoiceForm(customer, { name: buyerName });
    const ctx = {
      ...invoice.form,
      data: { ...invoice.form.data, addOnLoad: jest.fn() },
      ui: { ...invoice.form.ui, getFormType: jest.fn(() => formType) },
    } as unknown as Xrm.FormContext;
    const reader = api(account);
    reader.retrieveMultipleRecords.mockResolvedValue({ entities: [] });
    (globalThis as unknown as { Xrm: unknown }).Xrm = { WebApi: reader };
    return { ...invoice, customer, ctx, reader };
  }

  it("fills empty buyer fields from a customer prefilled on a new invoice", async () => {
    const { ctx, name, customer } = loadForm(1);
    await onLoad({ getFormContext: () => ctx } as unknown as Xrm.Events.EventContext);
    expect(name.getValue()).toBe("Budex Sp. z o.o.");
    expect(customer.addOnChange).toHaveBeenCalledWith(onCustomerChange);
  });

  it("keeps buyer data already on a new invoice", async () => {
    const { ctx, name, reader } = loadForm(1, "Typed by user");
    await onLoad({ getFormContext: () => ctx } as unknown as Xrm.Events.EventContext);
    expect(name.getValue()).toBe("Typed by user");
    expect(reader.retrieveRecord).not.toHaveBeenCalled();
  });

  it("does not touch the buyer data of an existing invoice on load", async () => {
    const { ctx, reader, customer } = loadForm(2);
    await onLoad({ getFormContext: () => ctx } as unknown as Xrm.Events.EventContext);
    expect(reader.retrieveRecord).not.toHaveBeenCalled();
    expect(customer.addOnChange).toHaveBeenCalledWith(onCustomerChange);
  });
});
