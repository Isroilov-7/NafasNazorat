/**
 * Spirometry interpretation support (NOT a diagnosis).
 *
 * Combines measured values, reference equations (gli.ts) and classification
 * rules (gold.ts) into one structured, explainable result. It never guesses:
 * when inputs are incomplete it returns `obstruction: "indeterminate"` or
 * `confirmed: false` plus machine-readable flags that the UI must display.
 *
 * Sources: see gold.ts and gli.ts.
 */

import {
  type ErsAtsSeverity,
  type GoldGrade,
  type ObstructionMethod,
  ersAtsSeverity,
  goldGrade,
  isBorderlineRatio,
  isObstructedByFixedRatio,
  isObstructedByLln,
  isSignificantBronchodilatorResponse,
} from "./gold";
import {
  DEFAULT_ETHNICITY,
  DEFAULT_REFERENCE_EQUATION,
  type PredictedSet,
  type ReferenceEquationId,
  getReferenceEquation,
  percentPredicted,
  predictedValues,
  zScore,
} from "./gli";
import type { GliEthnicity, Sex } from "./types";
import { isFiniteNumber } from "./types";

/** Physiologically plausible bounds for adult volumes in litres (input sanity, not normality). */
export const VOLUME_BOUNDS_L = { min: 0.1, max: 10 } as const;

export interface VolumePair {
  fev1L?: number | null;
  fvcL?: number | null;
}

export interface SpirometryInput {
  ageYears?: number | null;
  heightCm?: number | null;
  sex?: Sex | null;
  ethnicity?: GliEthnicity | null;
  pre?: VolumePair | null;
  post?: VolumePair | null;
}

export interface InterpretOptions {
  method: ObstructionMethod;
  equationId?: ReferenceEquationId;
}

export type SpirometryFlag =
  | "postBronchodilatorMissing"
  | "noValidMeasurements"
  | "demographicsMissing"
  | "outsideReferenceRange"
  | "llnUnavailable"
  | "fev1ExceedsFvcPre"
  | "fev1ExceedsFvcPost"
  | "implausibleVolumePre"
  | "implausibleVolumePost"
  | "borderlineRatio"
  | "methodsDisagree"
  | "prism"
  | "significantBronchodilatorResponse";

export interface MeasuredSummary {
  fev1L: number;
  fvcL: number;
  ratio: number;
  fev1PctPred: number | null;
  fvcPctPred: number | null;
  fev1Z: number | null;
  fvcZ: number | null;
  ratioZ: number | null;
}

export type ObstructionStatus = "present" | "absent" | "indeterminate";

export interface SpirometryInterpretation {
  method: ObstructionMethod;
  equationId: ReferenceEquationId;
  predicted: PredictedSet | null;
  pre: MeasuredSummary | null;
  post: MeasuredSummary | null;
  /** Which measurement set the classification is based on. */
  basis: "post" | "pre" | null;
  obstruction: ObstructionStatus;
  /** True only when obstruction status is based on post-bronchodilator values. */
  confirmedPostBd: boolean;
  /** Result of the *other* method, for transparency (null if not computable). */
  alternateMethodObstructed: boolean | null;
  /** GOLD grade — only assigned on post-BD values with obstruction present. */
  goldGrade: GoldGrade | null;
  /** ERS/ATS z-score severity (only when obstruction present and z available). */
  ersAtsSeverity: ErsAtsSeverity | null;
  flags: SpirometryFlag[];
}

type PairValidation =
  | { ok: true; fev1L: number; fvcL: number }
  | { ok: false; reason: "missing" | "implausible" | "fev1ExceedsFvc" };

function validatePair(pair: VolumePair | null | undefined): PairValidation {
  const fev1 = pair?.fev1L;
  const fvc = pair?.fvcL;
  if (!isFiniteNumber(fev1) || !isFiniteNumber(fvc)) return { ok: false, reason: "missing" };
  const inBounds = (v: number) => v >= VOLUME_BOUNDS_L.min && v <= VOLUME_BOUNDS_L.max;
  if (!inBounds(fev1) || !inBounds(fvc)) return { ok: false, reason: "implausible" };
  if (fev1 > fvc) return { ok: false, reason: "fev1ExceedsFvc" };
  return { ok: true, fev1L: fev1, fvcL: fvc };
}

function summarize(fev1L: number, fvcL: number, predicted: PredictedSet | null): MeasuredSummary {
  const ratio = fev1L / fvcL;
  return {
    fev1L,
    fvcL,
    ratio,
    fev1PctPred: predicted ? percentPredicted(fev1L, predicted.FEV1.predicted) : null,
    fvcPctPred: predicted ? percentPredicted(fvcL, predicted.FVC.predicted) : null,
    fev1Z: predicted ? zScore(fev1L, predicted.FEV1) : null,
    fvcZ: predicted ? zScore(fvcL, predicted.FVC) : null,
    ratioZ: predicted ? zScore(ratio, predicted.FEV1FVC) : null,
  };
}

export function interpretSpirometry(input: SpirometryInput, options: InterpretOptions): SpirometryInterpretation {
  const equationId = options.equationId ?? DEFAULT_REFERENCE_EQUATION;
  const flags: SpirometryFlag[] = [];

  // 1. Reference values (only if demographics are complete and in range).
  let predicted: PredictedSet | null = null;
  const { ageYears, heightCm, sex } = input;
  if (!isFiniteNumber(ageYears) || !isFiniteNumber(heightCm) || !sex) {
    flags.push("demographicsMissing");
  } else {
    const eq = getReferenceEquation(equationId);
    if (ageYears < eq.ageRange.min || ageYears > eq.ageRange.max) {
      flags.push("outsideReferenceRange");
    } else {
      predicted = predictedValues(
        { ageYears, heightCm, sex, ethnicity: input.ethnicity ?? DEFAULT_ETHNICITY },
        equationId,
      );
      if (!predicted) flags.push("outsideReferenceRange");
    }
  }

  // 2. Measured values.
  const preV = validatePair(input.pre);
  const postV = validatePair(input.post);
  if (!preV.ok && preV.reason === "implausible") flags.push("implausibleVolumePre");
  if (!preV.ok && preV.reason === "fev1ExceedsFvc") flags.push("fev1ExceedsFvcPre");
  if (!postV.ok && postV.reason === "implausible") flags.push("implausibleVolumePost");
  if (!postV.ok && postV.reason === "fev1ExceedsFvc") flags.push("fev1ExceedsFvcPost");

  const pre = preV.ok ? summarize(preV.fev1L, preV.fvcL, predicted) : null;
  const post = postV.ok ? summarize(postV.fev1L, postV.fvcL, predicted) : null;
  const basisSummary = post ?? pre;
  const basis = post ? "post" : pre ? "pre" : null;

  if (!post) flags.push("postBronchodilatorMissing");
  if (!basisSummary) {
    flags.push("noValidMeasurements");
    return {
      method: options.method,
      equationId,
      predicted,
      pre,
      post,
      basis: null,
      obstruction: "indeterminate",
      confirmedPostBd: false,
      alternateMethodObstructed: null,
      goldGrade: null,
      ersAtsSeverity: null,
      flags,
    };
  }

  // 3. Obstruction by both methods (selected one is authoritative, the other is shown for transparency).
  const byFixed = isObstructedByFixedRatio(basisSummary.ratio);
  const byLln = predicted ? isObstructedByLln(basisSummary.ratio, predicted.FEV1FVC.lln) : null;
  if (options.method === "lln" && byLln === null) flags.push("llnUnavailable");

  const primary = options.method === "fixedRatio" ? byFixed : byLln;
  const alternate = options.method === "fixedRatio" ? byLln : byFixed;
  const obstruction: ObstructionStatus = primary === null ? "indeterminate" : primary ? "present" : "absent";

  if (byLln !== null && byLln !== byFixed) flags.push("methodsDisagree");
  if (isBorderlineRatio(basisSummary.ratio)) flags.push("borderlineRatio");

  // 4. Severity — GOLD grade strictly on post-BD values.
  let grade: GoldGrade | null = null;
  let severity: ErsAtsSeverity | null = null;
  if (obstruction === "present") {
    if (post && post.fev1PctPred !== null) grade = goldGrade(post.fev1PctPred);
    if (basisSummary.fev1Z !== null) severity = ersAtsSeverity(basisSummary.fev1Z);
  }

  // 5. PRISm: preserved ratio (≥ 0.70) with FEV1 < 80 % predicted (GOLD 2025), post-BD.
  if (post && !isObstructedByFixedRatio(post.ratio) && post.fev1PctPred !== null && post.fev1PctPred < 80) {
    flags.push("prism");
  }

  // 6. Bronchodilator response (ERS/ATS 2022).
  if (pre && post && predicted) {
    const fev1Resp = isSignificantBronchodilatorResponse(pre.fev1L, post.fev1L, predicted.FEV1.predicted);
    const fvcResp = isSignificantBronchodilatorResponse(pre.fvcL, post.fvcL, predicted.FVC.predicted);
    if (fev1Resp || fvcResp) flags.push("significantBronchodilatorResponse");
  }

  return {
    method: options.method,
    equationId,
    predicted,
    pre,
    post,
    basis,
    obstruction,
    confirmedPostBd: basis === "post" && obstruction !== "indeterminate",
    alternateMethodObstructed: alternate,
    goldGrade: grade,
    ersAtsSeverity: severity,
    flags,
  };
}
