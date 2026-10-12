/**
 * Shared clinical types. This module is framework-agnostic: no React, no Next,
 * no I/O. Everything here is pure data + pure functions so it can be unit-tested
 * and, later, re-used by a research pipeline or a mobile client.
 *
 * Domain functions never return user-facing text. They return stable codes
 * (e.g. `"packYears"`, `"postBronchodilatorMissing"`) that the UI translates
 * through the i18n layer.
 */

export type Sex = "male" | "female";

/**
 * GLI-2012 ethnic groups. Only used to select reference-equation coefficients.
 * See `reference/gli2012.ts` for the CLINICAL REVIEW note on which group to use
 * for the Uzbek population.
 */
export type GliEthnicity =
  | "caucasian"
  | "africanAmerican"
  | "northEastAsian"
  | "southEastAsian"
  | "other";

/** Traffic-light likelihood that spirometry / pulmonology evaluation is warranted. */
export type RiskLevel = "low" | "medium" | "high";

export const RISK_LEVELS: readonly RiskLevel[] = ["low", "medium", "high"] as const;

export function riskLevelRank(level: RiskLevel): number {
  return RISK_LEVELS.indexOf(level);
}

export function maxRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return riskLevelRank(a) >= riskLevelRank(b) ? a : b;
}

/** Narrow helper: finite number (rejects NaN / ±Infinity / undefined). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
