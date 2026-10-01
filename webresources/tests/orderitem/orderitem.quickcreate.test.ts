import { onLoad, onSave } from "../../src/orderitem/orderitem.quickcreate";
import { flushPromises, formContext, lookupAttribute, saveEventContext, webApi } from "../mocks/xrmMocks";

const MACHINE = "aaaaaaaa-0000-0000-0000-000000000001";
const ORDER = "bbbbbbbb-0000-0000-0000-000000000002";
const DATES = { cr679_startdate: "2026-10-01T08:00:00Z", cr679_enddate: "2026-10-05T16:00:00Z" };

function setWebApi(api: unknown) {
  (globalThis as unknown as { Xrm: unknown }).Xrm = { WebApi: api };
}

function filledForm() {
  return formContext({
    cr679_machineid: lookupAttribute(MACHINE),
    cr679_orderid: lookupAttribute(ORDER),
  });
}

function runSave(form: ReturnType<typeof formContext>, saveMode = 1) {
  const context = saveEventContext(form, saveMode);
  onSave(context as unknown as Xrm.Events.SaveEventContext);
  return context;
}

/** Simulates the platform calling onSave again after the script re-triggered save. */
function simulateResave(form: ReturnType<typeof formContext>) {
  return runSave(form);
}

describe("OrderItemQuickCreate", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it("onLoad registers the save handler", () => {
    const form = formContext();
    onLoad({ getFormContext: () => form } as unknown as Xrm.Events.EventContext);
    expect(form.data.entity.addOnSave).toHaveBeenCalledWith(onSave);
  });

  it("lets the platform save when machine or order is empty", () => {
    const form = formContext({ cr679_machineid: lookupAttribute(null), cr679_orderid: lookupAttribute(ORDER) });
    const context = runSave(form);
    expect(context.eventArgs.preventDefault).not.toHaveBeenCalled();
  });

  it("saves again with the original save mode when the machine is available", async () => {
    setWebApi(webApi(DATES, []));
    const form = filledForm();
    const context = runSave(form, 2 /* save and close */);

    expect(context.eventArgs.preventDefault).toHaveBeenCalled();
    await flushPromises();
    expect(form.data.entity.save).toHaveBeenCalledWith("saveandclose");

    // the re-triggered save must pass without a second check
    const resave = simulateResave(form);
    expect(resave.eventArgs.preventDefault).not.toHaveBeenCalled();
  });

  it("blocks the save and shows an error when the machine is taken", async () => {
    setWebApi(webApi(DATES, [{ cr679_orderid: "cccccccc-0000-0000-0000-000000000003" }]));
    const form = filledForm();
    runSave(form);
    await flushPromises();

    expect(form.data.entity.save).not.toHaveBeenCalled();
    expect(form.ui.setFormNotification).toHaveBeenCalledWith(
      expect.stringContaining("innego zamówienia"),
      "ERROR",
      "cr679_orderitem_availability"
    );
  });

  it("fails open with a warning when the Web API call fails", async () => {
    const api = webApi(DATES);
    api.retrieveRecord.mockRejectedValue(new Error("network"));
    setWebApi(api);
    const form = filledForm();
    runSave(form);
    await flushPromises();

    expect(form.ui.setFormNotification).toHaveBeenCalledWith(expect.any(String), "WARNING", "cr679_orderitem_availability");
    expect(form.data.entity.save).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    simulateResave(form); // consume the skip flag so it does not leak into other tests
  });
});
