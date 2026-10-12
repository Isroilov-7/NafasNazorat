/**
 * Case-finding heuristic configuration.
 *
 * ⚠ PROVISIONAL — NOT A VALIDATED INSTRUMENT. These weights and thresholds are
 * a transparent starting point, NOT derived from Uzbek patient data. They are
 * kept as data (not inline magic numbers) precisely so they can be tuned and
 * validated against local spirometry-confirmed outcomes (the research angle of
 * this project). Every saved assessment stores `config.version`, so results
 * remain reproducible after the weights change.
 *
 * Rationale / sources for the choice of factors:
 *  - GOLD 2025 Report, ch. 2 "Key indicators for considering a diagnosis of
 *    COPD": age ≥ 40, dyspnoea, chronic cough, chronic sputum, history of
 *    risk factors (tobacco smoke, smoke from home cooking/heating fuels
 *    (biomass), occupational dusts/vapours/fumes/gases/chemicals).
 *  - Structure (age + pack-year bands + symptom items) mirrors validated
 *    case-finding questionnaires: COPD Diagnostic Questionnaire (Price DB et
 *    al. Chest 2006;129:1531) and COPD-PS (Martinez FJ et al. COPD
 *    2008;5:85). Point values here are NOT those instruments' values.
 *  - Symptom-burden cut-offs mMRC ≥ 2 and CAT ≥ 10 from GOLD 2025.
 *
 * CLINICAL REVIEW REQUIRED before real use.
 */

import type { MmrcGrade } from "./mmrc";
import type { RiskLevel } from "./types";

/** Ascending bands: a value scores the points of the highest band whose `min` it reaches. */
export interface Band {
  min: number;
  points: number;
}

export type ReferralRecommendation =
  /** No referral now; re-assess at next routine visit or if symptoms change. */
  | "routineFollowUp"
  /** Refer for (post-bronchodilator) spirometry. */
  | "spirometry"
  /** Priority spirometry and pulmonology review. */
  | "spirometryPriorityPulmonology";

export interface EscalationRule {
  /** Stable id, translated in the UI (riskRules.<id>). */
  id: string;
  /** Result is raised to at least this level when ALL present conditions hold. */
  minLevel: RiskLevel;
  when: {
    minAge?: number;
    /** Satisfied when ANY listed exposure reaches its minimum. */
    exposure?: { minPackYears?: number; minBiomassYears?: number; minOccupationalYears?: number };
    /** Satisfied when EITHER symptom score reaches its minimum. */
    symptomBurden?: { minMmrc?: MmrcGrade; minCat?: number };
  };
}

export interface RiskScoreConfig {
  version: string;
  status: "provisional" | "validated";
  factors: {
    ageYears: Band[];
    packYears: Band[];
    /** Years of exposure to biomass / indoor smoke. */
    biomassYears: Band[];
    /** Years of occupational dust / fume exposure. */
    occupationalYears: Band[];
    chronicCough: number;
    sputum: number;
    dyspnea: number;
    mmrc: Record<MmrcGrade, number>;
    catTotal: Band[];
  };
  /** Total score at/above which the level applies. */
  thresholds: { medium: number; high: number };
  escalationRules: EscalationRule[];
  followUp: Record<RiskLevel, { recommendation: ReferralRecommendation; reviewInMonths: number }>;
}

export const DEFAULT_RISK_CONFIG: RiskScoreConfig = {
  version: "2026.10-provisional.1",
  status: "provisional",
  factors: {
    ageYears: [
      { min: 0, points: 0 },
      { min: 40, points: 1 },
      { min: 50, points: 2 },
      { min: 60, points: 3 },
    ],
    packYears: [
      { min: 0, points: 0 },
      { min: 10, points: 2 },
      { min: 20, points: 3 },
      { min: 40, points: 4 },
    ],
    biomassYears: [
      { min: 0, points: 0 },
      { min: 1, points: 1 },
      { min: 10, points: 2 },
    ],
    occupationalYears: [
      { min: 0, points: 0 },
      { min: 1, points: 1 },
      { min: 10, points: 2 },
    ],
    chronicCough: 1,
    sputum: 1,
    dyspnea: 1,
    mmrc: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 3 },
    catTotal: [
      { min: 0, points: 0 },
      { min: 10, points: 1 },
      { min: 21, points: 2 },
    ],
  },
  thresholds: { medium: 5, high: 9 },
  escalationRules: [
    {
      // GOLD: symptomatic patient with a risk-factor history → spirometry indicated.
      id: "symptomaticWithExposure",
      minLevel: "high",
      when: {
        minAge: 40,
        exposure: { minPackYears: 10, minBiomassYears: 10, minOccupationalYears: 10 },
        symptomBurden: { minMmrc: 2, minCat: 10 },
      },
    },
    {
      // Heavy exposure alone after 40 warrants at least considering spirometry.
      id: "heavyExposureOver40",
      minLevel: "medium",
      when: {
        minAge: 40,
        exposure: { minPackYears: 20, minBiomassYears: 20, minOccupationalYears: 20 },
      },
    },
  ],
  followUp: {
    low: { recommendation: "routineFollowUp", reviewInMonths: 12 },
    medium: { recommendation: "spirometry", reviewInMonths: 3 },
    high: { recommendation: "spirometryPriorityPulmonology", reviewInMonths: 1 },
  },
};
