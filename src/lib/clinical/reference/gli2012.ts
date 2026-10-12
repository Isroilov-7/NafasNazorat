// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL REVIEW REQUIRED
// GLI-2012 has no Central Asian / Uzbek reference population. The ethnic group
// used for Uzbek patients (default: "other" = Other/mixed, see
// `DEFAULT_ETHNICITY` in ../gli.ts) and the choice of GLI-2012 vs GLI Global
// 2022 (race-neutral, ATS 2023 recommendation) MUST be validated by a
// clinician / national guideline before real clinical use. Wrong reference
// values shift % predicted, LLN and GOLD grade.
// ─────────────────────────────────────────────────────────────────────────────

import type { GliEthnicity } from "../types";
import {
  GLI2012_AGE_MAX,
  GLI2012_AGE_MIN,
  GLI2012_AGE_STEP,
  GLI2012_TABLES,
} from "./gli2012.data";
import type { Lms, ReferenceEquation, ReferenceInput, SpirometryIndex } from "./types";

/**
 * GLI-2012 multi-ethnic reference equations (LMS method with age splines).
 *
 * Source: Quanjer PH et al. Eur Respir J 2012;40:1324–1343.
 *   M = exp(a0 + a1·ln(height[cm]) + a2·ln(age) + a_eth + Mspline(age))
 *   S = exp(p0 + p1·ln(age) + p_eth + Sspline(age))
 *   L = q0 + q1·ln(age) + Lspline(age)
 * Spline values are linearly interpolated between 0.25-year age nodes, exactly
 * as in the GLI calculator and the `rspiro` reference implementation.
 */

/** Index into the 4-element ethnicity offset arrays; Caucasian is the baseline. */
const ETHNICITY_OFFSET_INDEX: Record<GliEthnicity, number | null> = {
  caucasian: null,
  africanAmerican: 0,
  northEastAsian: 1,
  southEastAsian: 2,
  other: 3,
};

function interpolate(values: readonly number[], age: number): number {
  const position = (age - GLI2012_AGE_MIN) / GLI2012_AGE_STEP;
  const i = Math.floor(position);
  const lower = values[i];
  if (lower === undefined) throw new RangeError("GLI-2012 spline index out of range");
  const upper = values[i + 1] ?? lower; // last node (age 95)
  return lower + (upper - lower) * (position - i);
}

export const gli2012: ReferenceEquation = {
  id: "gli2012",
  citation: "Quanjer PH et al. GLI-2012. Eur Respir J 2012;40:1324–1343",
  ageRange: { min: GLI2012_AGE_MIN, max: GLI2012_AGE_MAX },

  lms(index: SpirometryIndex, input: ReferenceInput): Lms | null {
    const { ageYears, heightCm, sex, ethnicity } = input;
    if (!Number.isFinite(ageYears) || !Number.isFinite(heightCm)) return null;
    if (ageYears < GLI2012_AGE_MIN || ageYears > GLI2012_AGE_MAX || heightCm <= 0) return null;

    const t = GLI2012_TABLES[sex][index];
    const ethIdx = ETHNICITY_OFFSET_INDEX[ethnicity];
    const aEth = ethIdx === null ? 0 : (t.aEthnicity[ethIdx] ?? 0);
    const pEth = ethIdx === null ? 0 : (t.pEthnicity[ethIdx] ?? 0);
    const lnAge = Math.log(ageYears);

    const M = Math.exp(
      t.a[0] + t.a[1] * Math.log(heightCm) + t.a[2] * lnAge + aEth + interpolate(t.mSpline, ageYears),
    );
    const S = Math.exp(t.p[0] + t.p[1] * lnAge + pEth + interpolate(t.sSpline, ageYears));
    const L = t.q[0] + t.q[1] * lnAge + interpolate(t.lSpline, ageYears);
    return { L, M, S };
  },
};
