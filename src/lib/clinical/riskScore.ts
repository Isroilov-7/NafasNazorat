/**
 * COPD case-finding heuristic: likelihood that spirometry / pulmonology
 * evaluation is warranted. It does NOT diagnose COPD.
 *
 * All weights, thresholds and rules come from a typed `RiskScoreConfig`
 * (riskConfig.ts) — see that file for sources and the PROVISIONAL status.
 * The result is fully explainable: every point is attributed to a factor.
 */

import { type Band, DEFAULT_RISK_CONFIG, type EscalationRule, type ReferralRecommendation, type RiskScoreConfig } from "./riskConfig";
import type { MmrcGrade } from "./mmrc";
import { type RiskLevel, isFiniteNumber, maxRiskLevel } from "./types";

export type SmokingStatus = "never" | "former" | "current";

export interface RiskInput {
  ageYears: number;
  smoking: { status: SmokingStatus; packYears: number | null };
  biomass: { exposed: boolean; years: number | null };
  occupational: { exposed: boolean; years: number | null };
  symptoms: { chronicCough: boolean; sputum: boolean; dyspnea: boolean };
  mmrc: MmrcGrade | null;
  catTotal: number | null;
}

export type RiskFactorKey =
  | "ageYears"
  | "packYears"
  | "biomassYears"
  | "occupationalYears"
  | "chronicCough"
  | "sputum"
  | "dyspnea"
  | "mmrc"
  | "catTotal";

export interface RiskContribution {
  factor: RiskFactorKey;
  /** The input value that produced the points (for explanation text). */
  value: number | boolean | null;
  points: number;
  maxPoints: number;
}

export interface RiskResult {
  level: RiskLevel;
  /** Level from the score alone, before escalation rules. */
  scoreLevel: RiskLevel;
  score: number;
  maxScore: number;
  /** All factors, in config order. */
  contributions: RiskContribution[];
  /** Factors that added points, highest first — the "why". */
  drivers: RiskContribution[];
  /** Ids of escalation rules that raised (or confirmed) the level. */
  triggeredRules: string[];
  /** Inputs that were missing; treated as 0 points (score may under-estimate). */
  missing: RiskFactorKey[];
  recommendation: ReferralRecommendation;
  reviewInMonths: number;
  configVersion: string;
}

export function bandPoints(bands: readonly Band[], value: number): number {
  let points = 0;
  for (const band of bands) if (value >= band.min) points = band.points;
  return points;
}

function maxBandPoints(bands: readonly Band[]): number {
  return bands.reduce((m, b) => Math.max(m, b.points), 0);
}

/**
 * Exposure years: `exposed: false` → 0. `exposed: true` with unknown duration
 * → scored as the minimum non-zero band (≥ 1 year) and reported as missing.
 */
function exposureYears(exposure: { exposed: boolean; years: number | null }): { years: number; missing: boolean } {
  if (!exposure.exposed) return { years: 0, missing: false };
  if (isFiniteNumber(exposure.years) && exposure.years >= 0) return { years: exposure.years, missing: false };
  return { years: 1, missing: true };
}

function levelFromScore(score: number, thresholds: RiskScoreConfig["thresholds"]): RiskLevel {
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.medium) return "medium";
  return "low";
}

interface ResolvedValues {
  ageYears: number;
  packYears: number;
  biomassYears: number;
  occupationalYears: number;
  mmrc: MmrcGrade | null;
  catTotal: number | null;
}

export function ruleApplies(rule: EscalationRule, v: ResolvedValues): boolean {
  const { minAge, exposure, symptomBurden } = rule.when;
  if (minAge !== undefined && v.ageYears < minAge) return false;
  if (exposure) {
    const hit =
      (exposure.minPackYears !== undefined && v.packYears >= exposure.minPackYears) ||
      (exposure.minBiomassYears !== undefined && v.biomassYears >= exposure.minBiomassYears) ||
      (exposure.minOccupationalYears !== undefined && v.occupationalYears >= exposure.minOccupationalYears);
    if (!hit) return false;
  }
  if (symptomBurden) {
    const hit =
      (symptomBurden.minMmrc !== undefined && v.mmrc !== null && v.mmrc >= symptomBurden.minMmrc) ||
      (symptomBurden.minCat !== undefined && v.catTotal !== null && v.catTotal >= symptomBurden.minCat);
    if (!hit) return false;
  }
  return true;
}

export function computeRisk(input: RiskInput, config: RiskScoreConfig = DEFAULT_RISK_CONFIG): RiskResult {
  const f = config.factors;
  const missing: RiskFactorKey[] = [];

  let packYears = 0;
  if (input.smoking.status !== "never") {
    if (isFiniteNumber(input.smoking.packYears) && input.smoking.packYears >= 0) packYears = input.smoking.packYears;
    else missing.push("packYears");
  }
  const biomass = exposureYears(input.biomass);
  if (biomass.missing) missing.push("biomassYears");
  const occupational = exposureYears(input.occupational);
  if (occupational.missing) missing.push("occupationalYears");
  if (input.mmrc === null) missing.push("mmrc");
  const catTotal = isFiniteNumber(input.catTotal) ? input.catTotal : null;
  if (catTotal === null) missing.push("catTotal");

  const mmrcMax = Math.max(...Object.values(f.mmrc));
  const contributions: RiskContribution[] = [
    { factor: "ageYears", value: input.ageYears, points: bandPoints(f.ageYears, input.ageYears), maxPoints: maxBandPoints(f.ageYears) },
    { factor: "packYears", value: input.smoking.status === "never" ? 0 : (input.smoking.packYears ?? null), points: bandPoints(f.packYears, packYears), maxPoints: maxBandPoints(f.packYears) },
    { factor: "biomassYears", value: input.biomass.exposed ? (input.biomass.years ?? null) : 0, points: bandPoints(f.biomassYears, biomass.years), maxPoints: maxBandPoints(f.biomassYears) },
    { factor: "occupationalYears", value: input.occupational.exposed ? (input.occupational.years ?? null) : 0, points: bandPoints(f.occupationalYears, occupational.years), maxPoints: maxBandPoints(f.occupationalYears) },
    { factor: "chronicCough", value: input.symptoms.chronicCough, points: input.symptoms.chronicCough ? f.chronicCough : 0, maxPoints: f.chronicCough },
    { factor: "sputum", value: input.symptoms.sputum, points: input.symptoms.sputum ? f.sputum : 0, maxPoints: f.sputum },
    { factor: "dyspnea", value: input.symptoms.dyspnea, points: input.symptoms.dyspnea ? f.dyspnea : 0, maxPoints: f.dyspnea },
    { factor: "mmrc", value: input.mmrc, points: input.mmrc === null ? 0 : f.mmrc[input.mmrc], maxPoints: mmrcMax },
    { factor: "catTotal", value: catTotal, points: catTotal === null ? 0 : bandPoints(f.catTotal, catTotal), maxPoints: maxBandPoints(f.catTotal) },
  ];

  const score = contributions.reduce((sum, c) => sum + c.points, 0);
  const maxScore = contributions.reduce((sum, c) => sum + c.maxPoints, 0);
  const scoreLevel = levelFromScore(score, config.thresholds);

  const resolved: ResolvedValues = {
    ageYears: input.ageYears,
    packYears,
    biomassYears: biomass.missing ? 0 : biomass.years, // unknown duration never triggers a duration rule
    occupationalYears: occupational.missing ? 0 : occupational.years,
    mmrc: input.mmrc,
    catTotal,
  };
  let level = scoreLevel;
  const triggeredRules: string[] = [];
  for (const rule of config.escalationRules) {
    if (ruleApplies(rule, resolved)) {
      triggeredRules.push(rule.id);
      level = maxRiskLevel(level, rule.minLevel);
    }
  }

  const drivers = contributions
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points / b.maxPoints - a.points / a.maxPoints || b.points - a.points);

  const followUp = config.followUp[level];
  return {
    level,
    scoreLevel,
    score,
    maxScore,
    contributions,
    drivers,
    triggeredRules,
    missing,
    recommendation: followUp.recommendation,
    reviewInMonths: followUp.reviewInMonths,
    configVersion: config.version,
  };
}

/**
 * Next review date = assessment date + N calendar months (UTC, clamped to the
 * last day of the target month, e.g. 31 Jan + 1 month = 28/29 Feb).
 * Returns an ISO date (YYYY-MM-DD).
 */
export function nextReviewDate(from: Date, months: number): string {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(from.getUTCDate(), lastDay);
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}
