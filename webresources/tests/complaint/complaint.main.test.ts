import { filterOrders, onCustomerChange, onLoad, onOrderChange } from "../../src/complaint/complaint.main";
import { formContext, lookupAttribute, lookupControl } from "../mocks/xrmMocks";

const CUSTOMER = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_CUSTOMER = "cccccccc-0000-0000-0000-000000000003";
const ORDER = "bbbbbbbb-0000-0000-0000-000000000002";

function orderRecord(customerId: string | null) {
  return customerId
    ? {
        _cr679_customerid_value: customerId,
        "_cr679_customerid_value@OData.Community.Display.V1.FormattedValue": "Budimex-Rem",
        "_cr679_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "account",
      }
    : { _cr679_customerid_value: null };
}

function setWebApi(retrieveRecord: jest.Mock) {
  (globalThis as unknown as { Xrm: unknown }).Xrm = { WebApi: { retrieveRecord } };
}

function setup(customerId: string | null, orderId: string | null) {
  const customer = lookupAttribute(customerId);
  const order = lookupAttribute(orderId);
  const orderControl = lookupControl();
  const form = formContext({ cr679_customerid: customer, cr679_orderid: order }, { cr679_orderid: orderControl });
  const context = { getFormContext: () => form } as unknown as Xrm.Events.EventContext;
  return { form, customer, order, orderControl, context };
}

describe("ComplaintMain", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it("onLoad registers the order filter and change handlers", () => {
    const { context, customer, order, orderControl } = setup(null, null);
    onLoad(context);
    expect(orderControl.addPreSearch).toHaveBeenCalledWith(filterOrders);
    expect(customer.addOnChange).toHaveBeenCalledWith(onCustomerChange);
    expect(order.addOnChange).toHaveBeenCalledWith(onOrderChange);
  });

  describe("filterOrders", () => {
    it("limits orders to the selected customer", () => {
      const { context, orderControl } = setup(CUSTOMER, null);
      filterOrders(context);
      expect(orderControl.addCustomFilter).toHaveBeenCalledWith(expect.stringContaining(CUSTOMER), "cr679_order");
    });

    it("offers all orders when no customer is selected", () => {
      const { context, orderControl } = setup(null, null);
      filterOrders(context);
      expect(orderControl.addCustomFilter).not.toHaveBeenCalled();
    });
  });

  describe("onOrderChange", () => {
    it("fills an empty customer from the order", async () => {
      setWebApi(jest.fn().mockResolvedValue(orderRecord(CUSTOMER)));
      const { context, customer } = setup(null, ORDER);
      await onOrderChange(context);
      expect(customer.setValue).toHaveBeenCalledWith([{ id: CUSTOMER, name: "Budimex-Rem", entityType: "account" }]);
    });

    it("accepts an order of the same customer", async () => {
      setWebApi(jest.fn().mockResolvedValue(orderRecord(CUSTOMER)));
      const { context, customer, orderControl } = setup(CUSTOMER, ORDER);
      await onOrderChange(context);
      expect(customer.setValue).not.toHaveBeenCalled();
      expect(orderControl.setNotification).not.toHaveBeenCalled();
    });

    it("flags an order of another customer on the Order field", async () => {
      setWebApi(jest.fn().mockResolvedValue(orderRecord(OTHER_CUSTOMER)));
      const { context, customer, orderControl } = setup(CUSTOMER, ORDER);
      await onOrderChange(context);
      expect(customer.setValue).not.toHaveBeenCalled();
      expect(orderControl.setNotification).toHaveBeenCalledWith(
        expect.stringContaining("innego klienta"),
        "cr679_complaint_order_customer"
      );
    });

    it("does nothing when the order is cleared", async () => {
      const retrieve = jest.fn();
      setWebApi(retrieve);
      const { context, orderControl } = setup(CUSTOMER, null);
      await onOrderChange(context);
      expect(orderControl.clearNotification).toHaveBeenCalled();
      expect(retrieve).not.toHaveBeenCalled();
    });

    it("ignores the result when the user picked another order in the meantime", async () => {
      const { context, customer, order } = setup(null, ORDER);
      setWebApi(
        jest.fn().mockImplementation(async () => {
          order.setValue(null);
          return orderRecord(CUSTOMER);
        })
      );
      await onOrderChange(context);
      expect(customer.setValue).not.toHaveBeenCalled();
    });

    it("fails open with a warning when the Web API call fails", async () => {
      setWebApi(jest.fn().mockRejectedValue(new Error("network")));
      const { context, form, orderControl } = setup(CUSTOMER, ORDER);
      await onOrderChange(context);
      expect(orderControl.setNotification).not.toHaveBeenCalled();
      expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.any(String), "WARNING", "cr679_complaint_order_check");
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("onCustomerChange", () => {
    it("clears an order that belongs to another customer", async () => {
      setWebApi(jest.fn().mockResolvedValue(orderRecord(OTHER_CUSTOMER)));
      const { context, form, order } = setup(CUSTOMER, ORDER);
      await onCustomerChange(context);
      expect(order.setValue).toHaveBeenCalledWith(null);
      expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.any(String), "INFO", "cr679_complaint_order_check");
    });

    it("keeps an order of the new customer", async () => {
      setWebApi(jest.fn().mockResolvedValue(orderRecord(CUSTOMER)));
      const { context, order } = setup(CUSTOMER, ORDER);
      await onCustomerChange(context);
      expect(order.setValue).not.toHaveBeenCalled();
    });

    it("keeps the order when the customer is cleared", async () => {
      const retrieve = jest.fn();
      setWebApi(retrieve);
      const { context, order } = setup(null, ORDER);
      await onCustomerChange(context);
      expect(order.setValue).not.toHaveBeenCalled();
      expect(retrieve).not.toHaveBeenCalled();
    });
  });
});
