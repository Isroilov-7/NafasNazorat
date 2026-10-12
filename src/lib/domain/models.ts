/**
 * Persisted data model (types only — shared by server and UI).
 *
 * Privacy design:
 *  - PII (fullName, birthDate, phone) lives ONLY on `Patient`.
 *  - Every patient also gets a random, stable `pseudoId` (not derived from PII)
 *    which is the only identifier in research exports.
 *  - `consentResearch` gates inclusion in any export.
 *  - Every record carries createdBy/updatedBy + timestamps; changes are also
 *    written to the append-only `AuditEvent` log (field NAMES only, no values).
 */

import type {
  GliEthnicity,
  MmrcGrade,
  ObstructionMethod,
  ReferenceEquationId,
  RiskLevel,
  RiskResult,
  Sex,
  SmokingStatus,
  SpirometryInterpretation,
} from "@/lib/clinical";

export type Role = "doctor" | "admin" | "patient" | "researcher";
/** Roles that have a UI in the MVP. `patient` and `researcher` are scaffolded only. */
export const CLINICAL_ROLES = ["doctor", "admin"] as const satisfies readonly Role[];

export type ReferralStatus = "none" | "recommended" | "referred" | "completed" | "declined";
export const REFERRAL_STATUSES: readonly ReferralStatus[] = ["none", "recommended", "referred", "completed", "declined"];

export interface AuditStamp {
  createdBy: string;
  updatedBy: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Patient extends AuditStamp {
  id: string;
  pseudoId: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  sex: Sex;
  phone: string | null;
  consentResearch: boolean;
  consentAt: string | null;
  referralStatus: ReferralStatus;
  nextReviewDate: string | null; // YYYY-MM-DD
}

/** Raw answers captured by the risk-assessment flow. */
export interface AssessmentAnswers {
  heightCm: number;
  weightKg: number | null;
  smoking: { status: SmokingStatus; cigarettesPerDay: number | null; yearsSmoked: number | null; packYears: number | null };
  biomass: { exposed: boolean; years: number | null };
  occupational: { exposed: boolean; years: number | null };
  symptoms: { chronicCough: boolean; sputum: boolean; dyspnea: boolean };
  mmrc: MmrcGrade;
  catItems: Record<string, number>;
  catTotal: number;
}

/** Encounter: one risk assessment at a point in time. */
export interface Assessment extends AuditStamp {
  id: string;
  patientId: string;
  assessedAt: string; // ISO
  ageYears: number;
  answers: AssessmentAnswers;
  risk: RiskResult; // snapshot incl. configVersion → reproducible
}

export interface SpirometryRecord extends AuditStamp {
  id: string;
  patientId: string;
  testedAt: string; // YYYY-MM-DD
  ageYears: number;
  heightCm: number;
  sex: Sex;
  ethnicity: GliEthnicity;
  equationId: ReferenceEquationId;
  method: ObstructionMethod;
  pre: { fev1L: number; fvcL: number } | null;
  post: { fev1L: number; fvcL: number } | null;
  interpretation: SpirometryInterpretation;
}

export interface Referral {
  id: string;
  patientId: string;
  status: ReferralStatus;
  note: string | null;
  assessmentId: string | null;
  createdBy: string;
  createdAt: string;
}

export type AuditAction = "create" | "update" | "export" | "login";
export type AuditEntity = "patient" | "assessment" | "spirometry" | "referral" | "user" | "researchExport";

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  patientId: string | null;
  /** Names of the fields touched — never their values (no PII in the log). */
  fields: string[];
}

export interface PatientListItem {
  id: string;
  pseudoId: string;
  fullName: string;
  birthDate: string;
  sex: Sex;
  referralStatus: ReferralStatus;
  nextReviewDate: string | null;
  lastAssessedAt: string | null;
  lastRiskLevel: RiskLevel | null;
  lastRiskScore: number | null;
}
