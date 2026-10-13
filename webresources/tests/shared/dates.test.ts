import { addDays, sameDay, today } from "../../src/shared/dates";

describe("dates", () => {
  it("today drops the time of day", () => {
    expect(today(new Date(2026, 9, 13, 23, 59, 10))).toEqual(new Date(2026, 9, 13));
  });

  it("addDays crosses month and year ends", () => {
    expect(addDays(new Date(2026, 0, 25), 14)).toEqual(new Date(2026, 1, 8));
    expect(addDays(new Date(2026, 11, 20), 14)).toEqual(new Date(2027, 0, 3));
    expect(addDays(new Date(2026, 1, 1), -1)).toEqual(new Date(2026, 0, 31));
  });

  it("addDays keeps midnight across a DST change", () => {
    // Poland switches to winter time on the last Sunday of October.
    expect(addDays(new Date(2026, 9, 20), 14)).toEqual(new Date(2026, 10, 3));
  });

  it("sameDay ignores the time and treats a missing date as different", () => {
    expect(sameDay(new Date(2026, 9, 13, 8), new Date(2026, 9, 13, 20))).toBe(true);
    expect(sameDay(new Date(2026, 9, 13), new Date(2026, 9, 14))).toBe(false);
    expect(sameDay(null, new Date(2026, 9, 13))).toBe(false);
    expect(sameDay(null, null)).toBe(false);
  });
});
