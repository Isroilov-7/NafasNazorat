/**
 * COPD Assessment Test (CAT): 8 items, each scored 0–5, total 0–40.
 *
 * Sources:
 *  - Jones PW et al. Development and first validation of the COPD Assessment
 *    Test. Eur Respir J 2009;34:648–654.
 *  - CAT Healthcare Professional User Guide (impact bands: <10 low,
 *    10–20 medium, 21–30 high, >30 very high).
 *  - GOLD 2025 Report: CAT ≥ 10 = "more symptomatic".
 *
 * CLINICAL REVIEW REQUIRED: CAT is a licensed instrument (© GSK). Before real
 * clinical use, item wording must be replaced with the officially licensed and
 * linguistically validated Uzbek translation.
 */

export const CAT_ITEM_COUNT = 8;
export const CAT_ITEM_MIN = 0;
export const CAT_ITEM_MAX = 5;
export const CAT_TOTAL_MAX = CAT_ITEM_COUNT * CAT_ITEM_MAX; // 40

/** GOLD "more symptomatic" threshold. */
export const CAT_HIGH_SYMPTOM_THRESHOLD = 10;

/** Stable item keys (order = official CAT order). Text lives in i18n. */
export const CAT_ITEM_KEYS = [
  "cough",
  "phlegm",
  "chestTightness",
  "breathlessness",
  "activities",
  "confidence",
  "sleep",
  "energy",
] as const;

export type CatItemKey = (typeof CAT_ITEM_KEYS)[number];
export type CatItemScore = 0 | 1 | 2 | 3 | 4 | 5;
export type CatImpact = "low" | "medium" | "high" | "veryHigh";

export function isCatItemScore(value: unknown): value is CatItemScore {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= CAT_ITEM_MIN &&
    value <= CAT_ITEM_MAX
  );
}

export type CatScoreResult =
  | { complete: true; total: number; impact: CatImpact; answered: number }
  | { complete: false; total: null; impact: null; answered: number; missing: CatItemKey[] };

/**
 * Totals the CAT. Requires all 8 items answered with valid scores; otherwise
 * returns `complete: false` with the list of missing items (no imputation —
 * the official guidance does not define a pro-rated score).
 */
export function scoreCat(items: Partial<Record<CatItemKey, number | null | undefined>>): CatScoreResult {
  const missing: CatItemKey[] = [];
  let total = 0;
  for (const key of CAT_ITEM_KEYS) {
    const v = items[key];
    if (isCatItemScore(v)) total += v;
    else missing.push(key);
  }
  const answered = CAT_ITEM_COUNT - missing.length;
  if (missing.length > 0) return { complete: false, total: null, impact: null, answered, missing };
  return { complete: true, total, impact: catImpact(total), answered };
}

export function catImpact(total: number): CatImpact {
  if (total < 10) return "low";
  if (total <= 20) return "medium";
  if (total <= 30) return "high";
  return "veryHigh";
}

export function isCatHighSymptom(total: number): boolean {
  return total >= CAT_HIGH_SYMPTOM_THRESHOLD;
}
