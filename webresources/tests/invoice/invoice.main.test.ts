import {
  applyDefaults,
  applyOrderData,
  checkOrderCustomer,
  onIssueDateChange,
  onLoad,
  onOrderChange,
  showDocumentState,
} from "../../src/invoice/invoice.main";
import { InvoiceDocumentStatus } from "../../src/shared/schema";
import { RecordReader } from "../../src/shared/xrm";
import { formContext, lookupControl } from "../mocks/xrmMocks";

const FORM_TYPE_CREATE = 1;
const FORM_TYPE_UPDATE = 2;

function valueAttribute(value: unknown) {
  let current = value;
  return {
    getValue: jest.fn(() => current),
    setValue: jest.fn((next: unknown) => {
      current = next;
    }),
    addOnChange: jest.fn(),
  };
}

type ValueAttribute = ReturnType<typeof valueAttribute>;

function setup(status: number | null, errorMessage: string | null = null, formType = FORM_TYPE_UPDATE) {
  const form = formContext({
    cr679_documentstatus: valueAttribute(status),
    cr679_errormessage: valueAttribute(errorMessage),
  });
  const addOnLoad = jest.fn();
  const formWithData = {
    ...form,
    data: { ...form.data, addOnLoad },
    ui: { ...form.ui, getFormType: jest.fn(() => formType) },
  };
  return { form: formWithData, addOnLoad, ctx: formWithData as unknown as Xrm.FormContext };
}

/** environmentvariabledefinition rows as the Web API returns them, keyed by schema name. */
function settingsApi(variables: Record<string, { defaultvalue?: string | null; value?: string | null }>) {
  const api = {
    retrieveRecord: jest.fn(),
    retrieveMultipleRecords: jest.fn((_entity: string, options: string) => {
      const name = /schemaname eq '([^']+)'/.exec(options)?.[1] ?? "";
      const variable = variables[name];
      const entities = variable
        ? [
            {
              defaultvalue: variable.defaultvalue ?? null,
              environmentvariabledefinition_environmentvariablevalue: variable.value ? [{ value: variable.value }] : [],
            },
          ]
        : [];
      return Promise.resolve({ entities });
    }),
  };
  return api as typeof api & RecordReader;
}

const configured = { cr679_InvoiceVatRate: { defaultvalue: "23" }, cr679_InvoicePaymentTermDays: { defaultvalue: "14" } };

function newInvoice(values: { issue?: Date | null; due?: Date | null; vat?: number | null } = {}) {
  const issue = valueAttribute(values.issue ?? null);
  const due = valueAttribute(values.due ?? null);
  const vat = valueAttribute(values.vat ?? null);
  const form = formContext({ cr679_issuedate: issue, cr679_duedate: due, cr679_vatrate: vat });
  const ctx = form as unknown as Xrm.FormContext;
  const event = { getFormContext: () => ctx } as unknown as Xrm.Events.EventContext;
  return { form, ctx, event, issue, due, vat };
}

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const valueOf = (attribute: ValueAttribute) => attribute.getValue() as Date | number | null;

describe("InvoiceMain document state", () => {
  it("shows the generator's message as an error when generation failed", () => {
    const { form, ctx } = setup(InvoiceDocumentStatus.Failed, "Faktura nie jest powiązana z zamówieniem.");
    showDocumentState(ctx);
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(
      "Nie udało się wygenerować PDF: Faktura nie jest powiązana z zamówieniem.",
      "ERROR",
      "cr679_invoice_document"
    );
  });

  it("shows a generic error when the failed invoice has no message", () => {
    const { form, ctx } = setup(InvoiceDocumentStatus.Failed);
    showDocumentState(ctx);
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.stringContaining("Application Log"), "ERROR", expect.any(String));
  });

  it.each([InvoiceDocumentStatus.Requested, InvoiceDocumentStatus.Generating])(
    "tells the user the PDF is on its way for status %s",
    (status) => {
      const { form, ctx } = setup(status);
      showDocumentState(ctx);
      expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.stringContaining("Trwa generowanie"), "INFO", expect.any(String));
    }
  );

  it.each([InvoiceDocumentStatus.Generated, null])("shows nothing for status %s", (status) => {
    const { form, ctx } = setup(status);
    showDocumentState(ctx);
    expect(form.ui.clearFormNotification).toHaveBeenCalledWith("cr679_invoice_document");
    expect(form.ui.setFormNotification).not.toHaveBeenCalled();
  });

  it("shows nothing on an unsaved invoice although the status defaults to Requested", () => {
    const { form, ctx } = setup(InvoiceDocumentStatus.Requested, null, FORM_TYPE_CREATE);
    showDocumentState(ctx);
    expect(form.ui.setFormNotification).not.toHaveBeenCalled();
  });

  it("does not fail when the status field is missing from the form", () => {
    const form = formContext();
    expect(() => showDocumentState(form as unknown as Xrm.FormContext)).not.toThrow();
  });

  it("onLoad shows the state, refreshes it after every data load and applies no defaults to an existing invoice", async () => {
    const { form, addOnLoad, ctx } = setup(InvoiceDocumentStatus.Failed, "x");
    await onLoad({ getFormContext: () => ctx } as unknown as Xrm.Events.EventContext);
    expect(form.ui.setFormNotification).toHaveBeenCalledTimes(1);
    expect(form.getAttribute).not.toHaveBeenCalledWith("cr679_issuedate");

    addOnLoad.mock.calls[0][0]();
    expect(form.ui.setFormNotification).toHaveBeenCalledTimes(2);
  });

  it("onLoad applies the defaults on a new invoice", async () => {
    const api = settingsApi(configured);
    (globalThis as unknown as { Xrm: unknown }).Xrm = { WebApi: api };
    const { ctx } = setup(null, null, FORM_TYPE_CREATE);
    await onLoad({ getFormContext: () => ctx } as unknown as Xrm.Events.EventContext);
    expect(api.retrieveMultipleRecords).toHaveBeenCalledTimes(2);
  });
});

describe("InvoiceMain defaults", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: day(2026, 10, 13), doNotFake: ["setTimeout"] });
  });
  afterEach(() => jest.useRealTimers());

  it("fills issue date, due date and VAT rate on a new invoice", async () => {
    const { ctx, issue, due, vat, form } = newInvoice();
    await applyDefaults(ctx, settingsApi(configured));
    expect(valueOf(issue)).toEqual(day(2026, 10, 13));
    expect(valueOf(due)).toEqual(day(2026, 10, 27));
    expect(valueOf(vat)).toBe(23);
    expect(form.ui.setFormNotification).not.toHaveBeenCalled();
  });

  it("prefers the current value of an environment variable over its default", async () => {
    const { ctx, vat, due } = newInvoice();
    await applyDefaults(
      ctx,
      settingsApi({ cr679_InvoiceVatRate: { defaultvalue: "23", value: "8" }, cr679_InvoicePaymentTermDays: { defaultvalue: "14", value: "30" } })
    );
    expect(valueOf(vat)).toBe(8);
    expect(valueOf(due)).toEqual(day(2026, 11, 12));
  });

  it("keeps values the user (or a command) already entered", async () => {
    const { ctx, issue, due, vat } = newInvoice({ issue: day(2026, 10, 1), due: day(2026, 10, 5), vat: 8 });
    await applyDefaults(ctx, settingsApi(configured));
    expect(valueOf(issue)).toEqual(day(2026, 10, 1));
    expect(valueOf(due)).toEqual(day(2026, 10, 5));
    expect(valueOf(vat)).toBe(8);
  });

  it("warns and leaves the fields empty when a variable is missing", async () => {
    const { ctx, due, vat, form } = newInvoice();
    await applyDefaults(ctx, settingsApi({ cr679_InvoicePaymentTermDays: { defaultvalue: "14" } }));
    expect(valueOf(vat)).toBeNull();
    expect(valueOf(due)).toEqual(day(2026, 10, 27));
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.stringContaining("Brak konfiguracji"), "WARNING", "cr679_invoice_defaults");
  });

  it("treats a non-numeric variable as missing", async () => {
    const { ctx, due, form } = newInvoice();
    await applyDefaults(ctx, settingsApi({ cr679_InvoiceVatRate: { defaultvalue: "23" }, cr679_InvoicePaymentTermDays: { defaultvalue: "two weeks" } }));
    expect(valueOf(due)).toBeNull();
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.any(String), "WARNING", expect.any(String));
  });

  it("fails open when the settings cannot be read", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { ctx, issue, vat, form } = newInvoice();
    const api = { retrieveRecord: jest.fn(), retrieveMultipleRecords: jest.fn().mockRejectedValue(new Error("403")) } as unknown as RecordReader;
    await expect(applyDefaults(ctx, api)).resolves.toBeUndefined();
    expect(valueOf(issue)).toEqual(day(2026, 10, 13));
    expect(valueOf(vat)).toBeNull();
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.stringContaining("Nie udało się odczytać"), "WARNING", "cr679_invoice_defaults");
    consoleError.mockRestore();
  });

  it("moves the calculated due date when the issue date changes", async () => {
    const { ctx, event, issue, due } = newInvoice();
    await applyDefaults(ctx, settingsApi(configured));
    expect(issue.addOnChange).toHaveBeenCalledWith(onIssueDateChange);

    issue.setValue(day(2026, 10, 20));
    onIssueDateChange(event);
    expect(valueOf(due)).toEqual(day(2026, 11, 3));

    issue.setValue(day(2026, 10, 25));
    onIssueDateChange(event);
    expect(valueOf(due)).toEqual(day(2026, 11, 8));
  });

  it("keeps a due date the user typed when the issue date changes", async () => {
    const { ctx, event, issue, due } = newInvoice();
    await applyDefaults(ctx, settingsApi(configured));
    due.setValue(day(2026, 12, 31));

    issue.setValue(day(2026, 10, 20));
    onIssueDateChange(event);
    expect(valueOf(due)).toEqual(day(2026, 12, 31));
  });

  it("does not clear the due date when the issue date is cleared", async () => {
    const { ctx, event, issue, due } = newInvoice();
    await applyDefaults(ctx, settingsApi(configured));
    issue.setValue(null);
    onIssueDateChange(event);
    expect(valueOf(due)).toEqual(day(2026, 10, 27));
  });

  it("does not leak the auto due date of one form into the next", async () => {
    const first = newInvoice();
    await applyDefaults(first.ctx, settingsApi(configured));

    const second = newInvoice({ due: day(2026, 10, 27) });
    await applyDefaults(second.ctx, settingsApi(configured));
    second.issue.setValue(day(2026, 10, 20));
    onIssueDateChange(second.event);
    expect(valueOf(second.due)).toEqual(day(2026, 10, 27));
  });
});

describe("InvoiceMain order", () => {
  const ORDER_ID = "bbbbbbbb-0000-0000-0000-000000000002";
  const ORDER_CUSTOMER = "aaaaaaaa-0000-0000-0000-000000000001";
  const OTHER_CUSTOMER = "cccccccc-0000-0000-0000-000000000003";

  function lookup(id: string | null, entityType = "account") {
    let current: Xrm.LookupValue[] | null = id ? [{ id, name: "x", entityType }] : null;
    return {
      getValue: jest.fn(() => current),
      setValue: jest.fn((next: Xrm.LookupValue[] | null) => {
        current = next;
      }),
      addOnChange: jest.fn(),
    };
  }

  function orderApi(options: { customer?: string | null; prices?: number[]; fail?: boolean } = {}) {
    const customer = options.customer === undefined ? ORDER_CUSTOMER : options.customer;
    const api = {
      retrieveRecord: jest.fn((entity: string) => {
        if (options.fail) return Promise.reject(new Error("503"));
        if (entity === "cr679_order") {
          return Promise.resolve({
            _cr679_customerid_value: customer,
            "_cr679_customerid_value@OData.Community.Display.V1.FormattedValue": "Budex",
            "_cr679_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "account",
          });
        }
        return Promise.resolve({ name: "Budex Sp. z o.o.", address1_composite: "ul. Polna 1", cr679_nip: "5250000000" });
      }),
      retrieveMultipleRecords: jest.fn(() =>
        options.fail
          ? Promise.reject(new Error("503"))
          : Promise.resolve({ entities: (options.prices ?? [150, 250]).map((p) => ({ cr679_itemprice: p })) })
      ),
    };
    return api as typeof api & RecordReader;
  }

  function orderForm(orderId: string | null, customerId: string | null, netAmount: number | null = null) {
    const order = lookup(orderId, "cr679_order");
    const customer = lookup(customerId);
    const net = { ...valueAttribute(netAmount), setSubmitMode: jest.fn() };
    const name = valueAttribute(null);
    const orderControl = lookupControl();
    const form = formContext(
      {
        cr679_orderid: order,
        cr679_customerid: customer,
        cr679_netamount: net,
        cr679_customername: name,
        cr679_customeraddress: valueAttribute(null),
        cr679_customernip: valueAttribute(null),
      },
      { cr679_orderid: orderControl }
    );
    const ctx = form as unknown as Xrm.FormContext;
    return { form, ctx, order, customer, net, name, orderControl };
  }

  it("sets the net amount to the order total and saves it although the field is read-only", async () => {
    const { ctx, net } = orderForm(ORDER_ID, ORDER_CUSTOMER, 10000);
    await applyOrderData(ctx, orderApi());
    expect(net.setSubmitMode).toHaveBeenCalledWith("always");
    expect(net.getValue()).toBe(400);
  });

  it("fills an empty customer from the order and copies the buyer data", async () => {
    const { ctx, customer, name } = orderForm(ORDER_ID, null);
    await applyOrderData(ctx, orderApi());
    expect(customer.getValue()).toEqual([{ id: ORDER_CUSTOMER, name: "Budex", entityType: "account" }]);
    expect(name.getValue()).toBe("Budex Sp. z o.o.");
  });

  it("flags an order of another customer", async () => {
    const { ctx, customer, orderControl } = orderForm(ORDER_ID, OTHER_CUSTOMER);
    await applyOrderData(ctx, orderApi());
    expect(customer.getValue()?.[0].id).toBe(OTHER_CUSTOMER);
    expect(orderControl.setNotification).toHaveBeenCalledWith("To zamówienie należy do innego klienta.", "cr679_invoice_order_customer");
  });

  it("leaves the amount when the order is cleared", async () => {
    const api = orderApi();
    const { ctx, net, orderControl } = orderForm(null, ORDER_CUSTOMER, 400);
    await applyOrderData(ctx, api);
    expect(net.getValue()).toBe(400);
    expect(orderControl.clearNotification).toHaveBeenCalledWith("cr679_invoice_order_customer");
    expect(api.retrieveRecord).not.toHaveBeenCalled();
  });

  it("warns and keeps the amount when the order cannot be read", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { ctx, net, form } = orderForm(ORDER_ID, ORDER_CUSTOMER, 400);
    await applyOrderData(ctx, orderApi({ fail: true }));
    expect(net.getValue()).toBe(400);
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.stringContaining("zamówienia"), "WARNING", "cr679_invoice_order");
    consoleError.mockRestore();
  });

  it("drops a late answer when the user picked another order meanwhile", async () => {
    const { ctx, net, order } = orderForm(ORDER_ID, ORDER_CUSTOMER);
    const api = orderApi();
    api.retrieveMultipleRecords.mockImplementation(async () => {
      order.setValue([{ id: "dddddddd-0000-0000-0000-000000000004", name: "y", entityType: "cr679_order" }]);
      return { entities: [{ cr679_itemprice: 400 }] };
    });
    await applyOrderData(ctx, api);
    expect(net.getValue()).toBeNull();
  });

  it("checkOrderCustomer flags a customer changed to someone else and clears the flag when it matches", async () => {
    const mismatch = orderForm(ORDER_ID, OTHER_CUSTOMER);
    await checkOrderCustomer(mismatch.ctx, orderApi());
    expect(mismatch.orderControl.setNotification).toHaveBeenCalled();

    const match = orderForm(ORDER_ID, ORDER_CUSTOMER);
    await checkOrderCustomer(match.ctx, orderApi());
    expect(match.orderControl.clearNotification).toHaveBeenCalled();
    expect(match.orderControl.setNotification).not.toHaveBeenCalled();
  });

  it("onOrderChange uses the form's order", async () => {
    const api = orderApi();
    (globalThis as unknown as { Xrm: unknown }).Xrm = { WebApi: api };
    const { ctx, net } = orderForm(ORDER_ID, ORDER_CUSTOMER);
    await onOrderChange({ getFormContext: () => ctx } as unknown as Xrm.Events.EventContext);
    expect(net.getValue()).toBe(400);
  });
});
