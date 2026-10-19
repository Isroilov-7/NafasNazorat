/**
 * Human-readable description of the case-finding scale, DERIVED from the
 * risk config — never hand-copied. Used by the public methodology page
 * (`/metodika`) so the published explanation cannot drift from what
 * `computeRisk` actually does: change a weight in `riskConfig.ts` and the
 * table, the maximum ("19 ball") and the level ranges follow automatically.
 */

import { type Band, DEFAULT_RISK_CONFIG, type ReferralRecommendation, type RiskScoreConfig } from "./riskConfig";
import type { RiskFactorKey } from "./riskScore";
import type { RiskLevel } from "./types";

/** One row of the points table. Bounds are inclusive at `min`, exclusive at `max`. */
export type ScaleCriterion =
  | { kind: "below"; max: number; points: number }
  | { kind: "range"; min: number; max: number; points: number }
  | { kind: "atLeast"; min: number; points: number }
  | { kind: "yes"; points: number }
  | { kind: "grade"; grade: number; points: number };

export interface ScaleFactor {
  factor: RiskFactorKey;
  /** Smallest input increment — 0.1 for pack-years, 1 otherwise (for "10–19,9" style labels). */
  step: number;
  criteria: ScaleCriterion[];
  maxPoints: number;
}

export interface ScaleLevel {
  level: RiskLevel;
  minScore: number;
  maxScore: number;
  recommendation: ReferralRecommendation;
  reviewInMonths: number;
}

export interface RiskScale {
  version: string;
  status: RiskScoreConfig["status"];
  factors: ScaleFactor[];
  maxScore: number;
  levels: ScaleLevel[];
}

function bandCriteria(bands: readonly Band[]): ScaleCriterion[] {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  return sorted.map((band, i): ScaleCriterion => {
    const next = sorted[i + 1];
    if (!next) return { kind: "atLeast", min: band.min, points: band.points };
    if (i === 0 && band.min <= 0) return { kind: "below", max: next.min, points: band.points };
    return { kind: "range", min: band.min, max: next.min, points: band.points };
  });
}

const maxOf = (criteria: ScaleCriterion[]) => criteria.reduce((m, c) => Math.max(m, c.points), 0);

function factor(factorKey: RiskFactorKey, criteria: ScaleCriterion[], step = 1): ScaleFactor {
  return { factor: factorKey, step, criteria, maxPoints: maxOf(criteria) };
}

/** Factors in the same order as `computeRisk` contributions. */
export function describeRiskScale(config: RiskScoreConfig = DEFAULT_RISK_CONFIG): RiskScale {
  const f = config.factors;
  const factors: ScaleFactor[] = [
    factor("ageYears", bandCriteria(f.ageYears)),
    factor("packYears", bandCriteria(f.packYears), 0.1),
    factor("biomassYears", bandCriteria(f.biomassYears)),
    factor("occupationalYears", bandCriteria(f.occupationalYears)),
    factor("chronicCough", [{ kind: "yes", points: f.chronicCough }]),
    factor("sputum", [{ kind: "yes", points: f.sputum }]),
    factor("dyspnea", [{ kind: "yes", points: f.dyspnea }]),
    factor(
      "mmrc",
      Object.entries(f.mmrc)
        .map(([grade, points]) => ({ kind: "grade" as const, grade: Number(grade), points }))
        .sort((a, b) => a.grade - b.grade),
    ),
    factor("catTotal", bandCriteria(f.catTotal)),
  ];
  const maxScore = factors.reduce((sum, x) => sum + x.maxPoints, 0);
  const { medium, high } = config.thresholds;
  const level = (l: RiskLevel, minScore: number, maxScore: number): ScaleLevel => ({
    level: l,
    minScore,
    maxScore,
    recommendation: config.followUp[l].recommendation,
    reviewInMonths: config.followUp[l].reviewInMonths,
  });
  return {
    version: config.version,
    status: config.status,
    factors,
    maxScore,
    levels: [level("low", 0, medium - 1), level("medium", medium, high - 1), level("high", high, maxScore)],
  };
}
