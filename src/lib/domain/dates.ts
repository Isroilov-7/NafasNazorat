/**
 * Date helpers (pure). Clinical dates are calendar dates in the clinic's time
 * zone (Asia/Tashkent), stored as YYYY-MM-DD strings.
 */

export const CLINIC_TIME_ZONE = "Asia/Tashkent";

/** Today's calendar date in the clinic time zone, YYYY-MM-DD. */
export function todayInClinic(now: Date = new Date(), timeZone = CLINIC_TIME_ZONE): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Completed years between birth date and reference date (both YYYY-MM-DD). */
export function ageOn(birthDate: string, onDate: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [y, m, d] = onDate.split("-").map(Number) as [number, number, number];
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

export type ReviewState = "overdue" | "dueSoon" | "scheduled" | "none";

/** Review reminder state: overdue (< today), due within `soonDays`, scheduled later, or none. */
export function reviewState(nextReviewDate: string | null, today: string, soonDays = 14): ReviewState {
  if (!nextReviewDate) return "none";
  if (nextReviewDate < today) return "overdue";
  const diff = (Date.parse(`${nextReviewDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  return diff <= soonDays ? "dueSoon" : "scheduled";
}
