import type { GliEthnicity, Sex } from "../types";

/** Spirometric indices for which predicted values are computed. */
export type SpirometryIndex = "FEV1" | "FVC" | "FEV1FVC";

export const SPIROMETRY_INDICES: readonly SpirometryIndex[] = ["FEV1", "FVC", "FEV1FVC"] as const;

export interface ReferenceInput {
  ageYears: number;
  heightCm: number;
  sex: Sex;
  ethnicity: GliEthnicity;
}

/**
 * LMS parameters (Cole TJ, Green PJ. Stat Med 1992;11:1305–1319):
 *  L = skewness (Box-Cox power), M = median (= predicted value),
 *  S = coefficient of variation.
 * Any reference equation can be expressed this way; a classic linear
 * equation is simply L = 1, S = RSD / M.
 */
export interface Lms {
  L: number;
  M: number;
  S: number;
}

/**
 * Pluggable reference-equation strategy. Add new populations (e.g. GLI Global
 * 2022, or locally derived Uzbek equations once available) by implementing this
 * interface and registering it in `../gli.ts`.
 */
export interface ReferenceEquation {
  /** Stable id persisted with every spirometry result (for reproducibility). */
  readonly id: string;
  /** Human-readable source citation (not translated; shown in the "method" footnote). */
  readonly citation: string;
  readonly ageRange: { min: number; max: number };
  /** Returns LMS for the index, or `null` when the input is outside the equation's validity range. */
  lms(index: SpirometryIndex, input: ReferenceInput): Lms | null;
}
