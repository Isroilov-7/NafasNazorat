/**
 * Airflow obstruction and severity grading.
 *
 * Sources:
 *  - GOLD 2025 Report, ch. 2: COPD is confirmed by post-bronchodilator
 *    FEV1/FVC < 0.70; spirometric grade by post-BD FEV1 % predicted:
 *      GOLD 1 (mild) ≥ 80 · GOLD 2 (moderate) 50–79 · GOLD 3 (severe) 30–49 ·
 *      GOLD 4 (very severe) < 30.
 *  - Stanojevic S et al. ERS/ATS technical standard on interpretive strategies
 *    for routine lung function tests. Eur Respir J 2022;60:2101499:
 *      obstruction = FEV1/FVC < LLN (z < −1.645); severity by FEV1 z-score:
 *      mild > −2.5 · moderate −2.5 to −4 · severe < −4;
 *      bronchodilator response = change > 10 % of the predicted value.
 */

import { isFiniteNumber } from "./types";

export const FIXED_RATIO_THRESHOLD = 0.7;

/** Ratio window in which a fixed-ratio result is considered borderline (repeat / consider LLN). */
export const BORDERLINE_RATIO_WINDOW = { min: 0.68, max: 0.72 } as const;

export type ObstructionMethod = "fixedRatio" | "lln";
export type GoldGrade = 1 | 2 | 3 | 4;
export type ErsAtsSeverity = "mild" | "moderate" | "severe";

export function isObstructedByFixedRatio(fev1FvcRatio: number): boolean {
  return fev1FvcRatio < FIXED_RATIO_THRESHOLD;
}

export function isObstructedByLln(fev1FvcRatio: number, ratioLln: number): boolean {
  return fev1FvcRatio < ratioLln;
}

export function isBorderlineRatio(fev1FvcRatio: number): boolean {
  return fev1FvcRatio >= BORDERLINE_RATIO_WINDOW.min && fev1FvcRatio <= BORDERLINE_RATIO_WINDOW.max;
}

/** GOLD spirometric grade from post-BD FEV1 % predicted. `null` for invalid input. */
export function goldGrade(fev1PercentPredicted: number): GoldGrade | null {
  if (!isFiniteNumber(fev1PercentPredicted) || fev1PercentPredicted < 0) return null;
  if (fev1PercentPredicted >= 80) return 1;
  if (fev1PercentPredicted >= 50) return 2;
  if (fev1PercentPredicted >= 30) return 3;
  return 4;
}

/** ERS/ATS 2022 severity of obstruction from the FEV1 z-score. */
export function ersAtsSeverity(fev1Z: number): ErsAtsSeverity | null {
  if (!isFiniteNumber(fev1Z)) return null;
  if (fev1Z > -2.5) return "mild";
  if (fev1Z >= -4) return "moderate";
  return "severe";
}

/** ERS/ATS 2022 bronchodilator response: (post − pre) / predicted > 10 %. */
export function isSignificantBronchodilatorResponse(pre: number, post: number, predicted: number): boolean {
  if (!isFiniteNumber(pre) || !isFiniteNumber(post) || !isFiniteNumber(predicted) || predicted <= 0) {
    return false;
  }
  return ((post - pre) / predicted) * 100 > 10;
}
