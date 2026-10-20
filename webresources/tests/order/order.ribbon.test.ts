import { canCreateInvoice, createInvoice } from "../../src/order/order.ribbon";
import { InvoiceIssueError } from "../../src/order/order.helper";
import * as helper from "../../src/order/order.helper";
import { OrderStatus } from "../../src/shared/schema";

const ORDER_ID = "{BBBBBBBB-0000-0000-0000-000000000002}";

function orderForm(options: { status?: number | null; formType?: number; dirty?: boolean } = {}) {
  let status = options.status === undefined ? OrderStatus.Completed : options.status;
  const form = {
    getAttribute: jest.fn((name: string) =>
      name === "cr679_status" ? { getValue: () => status, setValue: (value: number) => (status = value) } : null
    ),
    data: {
      entity: { getId: () => ORDER_ID, getIsDirty: () => options.dirty ?? false },
      save: jest.fn(() => Promise.resolve()),
    },
    ui: { getFormType: () => options.formType ?? 2, refreshRibbon: jest.fn() },
  };
  return { form, ctx: form as unknown as Xrm.FormContext };
}

function installXrm() {
  const xrm = {
    WebApi: { retrieveMultipleRecords: jest.fn(), retrieveRecord: jest.fn(), createRecord: jest.fn() },
    Utility: { showProgressIndicator: jest.fn(), closeProgressIndicator: jest.fn() },
    Navigation: { openForm: jest.fn(() => Promise.resolve()), openAlertDialog: jest.fn(() => Promise.resolve()) },
  };
  (globalThis as unknown as { Xrm: unknown }).Xrm = xrm;
  return xrm;
}

afterEach(() => jest.restoreAllMocks());

describe("canCreateInvoice", () => {
  it("is enabled for a completed order without an invoice", async () => {
    installXrm();
    const hasInvoice = jest.spyOn(helper, "hasInvoice").mockResolvedValue(false);
    expect(await canCreateInvoice(orderForm().ctx)).toBe(true);
    expect(hasInvoice).toHaveBeenCalledWith(expect.anything(), ORDER_ID);
  });

  it("is disabled when the order already has an invoice", async () => {
    installXrm();
    jest.spyOn(helper, "hasInvoice").mockResolvedValue(true);
    expect(await canCreateInvoice(orderForm().ctx)).toBe(false);
  });

  it.each([OrderStatus.Confirmed, OrderStatus.InProgress, OrderStatus.Settled, null])(
    "is disabled for status %p without asking Dataverse",
    async (status) => {
      installXrm();
      const hasInvoice = jest.spyOn(helper, "hasInvoice");
      expect(await canCreateInvoice(orderForm({ status }).ctx)).toBe(false);
      expect(hasInvoice).not.toHaveBeenCalled();
    }
  );

  it("is disabled on an unsaved order", async () => {
    installXrm();
    expect(await canCreateInvoice(orderForm({ formType: 1 }).ctx)).toBe(false);
  });

  it("is disabled when the check fails", async () => {
    installXrm();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(helper, "hasInvoice").mockRejectedValue(new Error("503"));
    expect(await canCreateInvoice(orderForm().ctx)).toBe(false);
  });
});

describe("createInvoice", () => {
  it("creates the invoice, refreshes the ribbon and opens the invoice", async () => {
    const xrm = installXrm();
    const issue = jest.spyOn(helper, "issueInvoice").mockResolvedValue("dddddddd-0000-0000-0000-000000000004");
    const { form, ctx } = orderForm();

    await createInvoice(ctx);

    expect(issue).toHaveBeenCalledWith(xrm.WebApi, ORDER_ID);
    expect(form.ui.refreshRibbon).toHaveBeenCalled();
    expect(xrm.Navigation.openForm).toHaveBeenCalledWith({ entityName: "cr679_invoice", entityId: "dddddddd-0000-0000-0000-000000000004" });
    expect(xrm.Utility.closeProgressIndicator).toHaveBeenCalled();
  });

  it("saves unsaved changes first", async () => {
    installXrm();
    jest.spyOn(helper, "issueInvoice").mockResolvedValue("id");
    const { form, ctx } = orderForm({ dirty: true });
    await createInvoice(ctx);
    expect(form.data.save).toHaveBeenCalled();
  });

  it("shows the reason when the order is not ready", async () => {
    const xrm = installXrm();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(helper, "issueInvoice").mockRejectedValue(new InvoiceIssueError("To zamówienie ma już fakturę."));
    await createInvoice(orderForm().ctx);
    expect(xrm.Navigation.openAlertDialog).toHaveBeenCalledWith({ title: "Wystaw fakturę", text: "To zamówienie ma już fakturę." });
    expect(xrm.Navigation.openForm).not.toHaveBeenCalled();
    expect(xrm.Utility.closeProgressIndicator).toHaveBeenCalled();
  });

  it("refuses an order that is not completed", async () => {
    const xrm = installXrm();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const issue = jest.spyOn(helper, "issueInvoice");
    await createInvoice(orderForm({ status: OrderStatus.InProgress }).ctx);
    expect(issue).not.toHaveBeenCalled();
    expect(xrm.Navigation.openAlertDialog).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("zakończonego") }));
  });

  it("shows a generic message for technical errors", async () => {
    const xrm = installXrm();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(helper, "issueInvoice").mockRejectedValue(new Error("Principal user is missing prvCreatecr679_invoice"));
    await createInvoice(orderForm().ctx);
    expect(xrm.Navigation.openAlertDialog).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("Spróbuj ponownie") }));
  });
});
