/**
 * Date-only helpers. Form values of date-only columns are Date objects at local midnight,
 * so these work on calendar days in the user's time zone.
 */

/** Today at local midnight. */
export function today(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Adds calendar days; handles month ends and DST changes. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** True when both dates fall on the same calendar day; false when either is missing. */
export function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
