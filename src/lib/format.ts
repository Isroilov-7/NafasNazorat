/**
 * Clinical date/number display helpers. Uzbek convention: DD.MM.YYYY and a
 * decimal comma. Kept independent of ICU data (which varies between Node and
 * browsers for "uz") so server and client render identical strings.
 */

/** "2026-11-12" or ISO timestamp → "12.11.2026". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}` : "—";
}

/** ISO timestamp → "12.11.2026, 14:05" in the clinic time zone. */
export function formatDateTime(iso: string, timeZone = "Asia/Tashkent"): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}, ${get("hour")}:${get("minute")}`;
}

/** Fixed decimals with a decimal comma: (0.514, 2) → "0,51". */
export function formatDecimal(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(digits).replace(".", ",").replace("-", "−");
}
