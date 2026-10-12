/**
 * Modified Medical Research Council (mMRC) dyspnoea scale, grades 0–4.
 *
 * Sources:
 *  - Fletcher CM et al. BMJ 1959;2:257–266 (original MRC scale).
 *  - Bestall JC et al. Thorax 1999;54:581–586 (validation).
 *  - GOLD 2025 Report, Table 2.x: mMRC ≥ 2 = "more symptomatic" (group E/B
 *    assessment) — used here as the "high symptom burden" cut-off.
 */

export type MmrcGrade = 0 | 1 | 2 | 3 | 4;

export const MMRC_GRADES: readonly MmrcGrade[] = [0, 1, 2, 3, 4] as const;

/** GOLD "more symptomatic" threshold. */
export const MMRC_HIGH_SYMPTOM_THRESHOLD: MmrcGrade = 2;

export function isMmrcGrade(value: unknown): value is MmrcGrade {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4;
}

/** Parses a raw value to an mMRC grade, or `null` if it is not a valid grade. */
export function parseMmrc(value: unknown): MmrcGrade | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return isMmrcGrade(n) ? n : null;
}

export function isMmrcHighSymptom(grade: MmrcGrade): boolean {
  return grade >= MMRC_HIGH_SYMPTOM_THRESHOLD;
}
