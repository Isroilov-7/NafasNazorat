import { isFiniteNumber } from "./types";

/**
 * Pack-years = (cigarettes per day / 20) × years smoked.
 * One "pack" = 20 cigarettes.
 *
 * Source: GOLD 2025 Report, ch. 1 (risk factors); standard epidemiological
 * definition (e.g. Prignot J. Eur J Respir Dis 1987).
 *
 * Returns `null` for invalid input (negative / non-finite) rather than guessing.
 * Result is rounded to 1 decimal place.
 */
export function packYears(cigarettesPerDay: number, yearsSmoked: number): number | null {
  if (!isFiniteNumber(cigarettesPerDay) || !isFiniteNumber(yearsSmoked)) return null;
  if (cigarettesPerDay < 0 || yearsSmoked < 0) return null;
  // multiply before dividing to avoid binary rounding (7 × 3 / 20 = 1.05 → 1.1)
  return Math.round(((cigarettesPerDay * yearsSmoked) / 20) * 10) / 10;
}
