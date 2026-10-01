import { buildConflictFetchXml, checkMachineAvailability } from "../../src/orderitem/machineAvailability";
import { webApi } from "../mocks/xrmMocks";

const MACHINE = "{AAAAAAAA-0000-0000-0000-000000000001}";
const ORDER = "bbbbbbbb-0000-0000-0000-000000000002";
const OTHER_ORDER = "cccccccc-0000-0000-0000-000000000003";
const DATES = { cr679_startdate: "2026-10-01T08:00:00Z", cr679_enddate: "2026-10-05T16:00:00Z" };

describe("buildConflictFetchXml", () => {
  it("uses the normalized machine id and the overlap conditions", () => {
    const xml = buildConflictFetchXml(MACHINE, "2026-10-01T08:00:00.000Z", "2026-10-05T16:00:00.000Z");
    expect(xml).toContain("value='aaaaaaaa-0000-0000-0000-000000000001'");
    expect(xml).toContain("attribute='cr679_enddate' operator='ge' value='2026-10-01T08:00:00.000Z'");
    expect(xml).toContain("attribute='cr679_startdate' operator='le' value='2026-10-05T16:00:00.000Z'");
  });

  it("rejects a machine id that is not a GUID (no FetchXML injection)", () => {
    expect(() => buildConflictFetchXml("x' /><condition", "a", "b")).toThrow("Invalid GUID");
  });
});

describe("checkMachineAvailability", () => {
  it("is available when no overlapping order exists", async () => {
    const api = webApi(DATES, []);
    await expect(checkMachineAvailability(api, MACHINE, ORDER)).resolves.toEqual({ status: "available" });
    expect(api.retrieveRecord).toHaveBeenCalledWith("cr679_order", ORDER, "?$select=cr679_startdate,cr679_enddate");
  });

  it("is available without querying conflicts when the order has no dates", async () => {
    const api = webApi({ cr679_startdate: null, cr679_enddate: null });
    await expect(checkMachineAvailability(api, MACHINE, ORDER)).resolves.toEqual({ status: "available" });
    expect(api.retrieveMultipleRecords).not.toHaveBeenCalled();
  });

  it("reports a conflict with another order", async () => {
    const api = webApi(DATES, [{ cr679_orderid: OTHER_ORDER.toUpperCase() }]);
    await expect(checkMachineAvailability(api, MACHINE, ORDER)).resolves.toEqual({
      status: "conflict",
      conflictingOrderId: OTHER_ORDER,
      sameOrder: false,
    });
  });

  it("reports a conflict within the same order", async () => {
    const api = webApi(DATES, [{ cr679_orderid: ORDER }]);
    const result = await checkMachineAvailability(api, MACHINE, ORDER);
    expect(result).toMatchObject({ status: "conflict", sameOrder: true });
  });
});
