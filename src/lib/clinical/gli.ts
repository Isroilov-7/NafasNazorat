/**
 * Predicted values, % predicted, z-scores and lower limit of normal (LLN).
 *
 * Reference equations are a pluggable strategy (`ReferenceEquation`); GLI-2012
 * is the default. See `reference/gli2012.ts` for the CLINICAL REVIEW note.
 *
 * Sources:
 *  - LMS z-score & centiles: Cole TJ, Green PJ. Stat Med 1992;11:1305–1319.
 *  - LLN = 5th centile (z = −1.645): Quanjer PH et al. ERJ 2012;40:1324;
 *    Stanojevic S et al. ERS/ATS interpretive strategies, ERJ 2022;60:2101499.
 */

import { gli2012 } from "./reference/gli2012";
import type { Lms, ReferenceEquation, ReferenceInput, SpirometryIndex } from "./reference/types";
import type { GliEthnicity } from "./types";
import { isFiniteNumber } from "./types";

export type { Lms, ReferenceEquation, ReferenceInput, SpirometryIndex } from "./reference/types";

/** z-score of the 5th centile (one-sided). */
export const LLN_Z = -1.645;

// CLINICAL REVIEW REQUIRED: default GLI-2012 group for Uzbek patients.
export const DEFAULT_ETHNICITY: GliEthnicity = "other";

export const referenceEquations = {
  gli2012,
} as const satisfies Record<string, ReferenceEquation>;

export type ReferenceEquationId = keyof typeof referenceEquations;

export const DEFAULT_REFERENCE_EQUATION: ReferenceEquationId = "gli2012";

export function getReferenceEquation(id: ReferenceEquationId = DEFAULT_REFERENCE_EQUATION): ReferenceEquation {
  return referenceEquations[id];
}

export function isReferenceEquationId(value: unknown): value is ReferenceEquationId {
  return typeof value === "string" && Object.hasOwn(referenceEquations, value);
}

/** Lower limit of normal (5th centile) from LMS. */
export function lowerLimitOfNormal({ L, M, S }: Lms): number {
  if (L === 0) return M * Math.exp(LLN_Z * S);
  return M * Math.pow(1 + L * S * LLN_Z, 1 / L);
}

/** LMS z-score of a measured value. Returns `null` for non-positive / invalid measurements. */
export function zScore(measured: number, { L, M, S }: Lms): number | null {
  if (!isFiniteNumber(measured) || measured <= 0) return null;
  if (L === 0) return Math.log(measured / M) / S;
  return (Math.pow(measured / M, L) - 1) / (L * S);
}

/** measured / predicted × 100. Returns `null` for invalid inputs. */
export function percentPredicted(measured: number, predicted: number): number | null {
  if (!isFiniteNumber(measured) || !isFiniteNumber(predicted) || predicted <= 0 || measured < 0) return null;
  return (measured / predicted) * 100;
}

export interface PredictedIndex extends Lms {
  predicted: number;
  lln: number;
}

export type PredictedSet = Record<SpirometryIndex, PredictedIndex>;

/**
 * Predicted value + LLN for FEV1, FVC and FEV1/FVC.
 * Returns `null` when the patient is outside the equation's validity range —
 * callers must surface this as "cannot compute", never guess.
 */
export function predictedValues(
  input: ReferenceInput,
  equationId: ReferenceEquationId = DEFAULT_REFERENCE_EQUATION,
): PredictedSet | null {
  const eq = getReferenceEquation(equationId);
  const out: Partial<PredictedSet> = {};
  for (const index of ["FEV1", "FVC", "FEV1FVC"] as const) {
    const lms = eq.lms(index, input);
    if (!lms) return null;
    out[index] = { ...lms, predicted: lms.M, lln: lowerLimitOfNormal(lms) };
  }
  return out as PredictedSet;
}
