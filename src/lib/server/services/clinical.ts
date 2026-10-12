import "server-only";
import {
  DEFAULT_ETHNICITY,
  DEFAULT_REFERENCE_EQUATION,
  computeRisk,
  interpretSpirometry,
  nextReviewDate,
  packYears,
  scoreCat,
} from "@/lib/clinical";
import { ageOn, todayInClinic } from "@/lib/domain/dates";
import type { Assessment, AssessmentAnswers, Patient, ReferralStatus, SpirometryRecord } from "@/lib/domain/models";
import type { AssessmentData } from "@/lib/validation/assessment";
import type { SpirometryForm } from "@/lib/validation/spirometry";
import { transaction } from "../db";
import { insertAssessment } from "../repositories/assessments";
import { writeAudit } from "../repositories/audit";
import { getPatient, insertPatient, updatePatientFollowUp } from "../repositories/patients";
import { insertReferral } from "../repositories/referrals";
import { insertSpirometry } from "../repositories/spirometry";

/**
 * Application services: the ONLY place where clinical computation meets
 * persistence. Results are always recomputed server-side from the raw answers
 * (the client preview is never trusted), and each write + its audit entry is
 * one transaction.
 */

export class DomainError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export function buildAnswers(data: AssessmentData): AssessmentAnswers {
  const smoking = data.smoking;
  const py =
    smoking.status === "never" || smoking.cigarettesPerDay === null || smoking.yearsSmoked === null
      ? null
      : packYears(smoking.cigarettesPerDay, smoking.yearsSmoked);
  const cat = scoreCat(data.catItems);
  if (!cat.complete) throw new DomainError("assessment.errors.catIncomplete");
  return {
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    smoking: { ...smoking, packYears: smoking.status === "never" ? 0 : py },
    biomass: { exposed: data.biomass.exposed, years: data.biomass.exposed ? data.biomass.years : null },
    occupational: { exposed: data.occupational.exposed, years: data.occupational.exposed ? data.occupational.years : null },
    symptoms: data.symptoms,
    mmrc: data.mmrc,
    catItems: data.catItems,
    catTotal: cat.total,
  };
}

export function riskFromAnswers(answers: AssessmentAnswers, ageYears: number) {
  return computeRisk({
    ageYears,
    smoking: { status: answers.smoking.status, packYears: answers.smoking.packYears },
    biomass: answers.biomass,
    occupational: answers.occupational,
    symptoms: answers.symptoms,
    mmrc: answers.mmrc,
    catTotal: answers.catTotal,
  });
}

export function recordAssessment(
  data: AssessmentData,
  actorId: string,
  assessedAt: Date = new Date(),
): { patient: Patient; assessment: Assessment } {
  return transaction(() => {
    let patient: Patient;
    if (data.patient.mode === "existing") {
      const found = getPatient(data.patient.patientId);
      if (!found) throw new DomainError("assessment.errors.patientNotFound");
      patient = found;
    } else {
      patient = insertPatient(
        {
          fullName: data.patient.fullName,
          birthDate: data.patient.birthDate,
          sex: data.patient.sex,
          phone: data.patient.phone,
          consentResearch: data.patient.consentResearch,
        },
        actorId,
      );
      writeAudit({ actorId, action: "create", entity: "patient", entityId: patient.id, patientId: patient.id, fields: ["fullName", "birthDate", "sex", "phone", "consentResearch"] });
    }

    const today = todayInClinic(assessedAt);
    const ageYears = ageOn(patient.birthDate, today);
    if (ageYears < 18 || ageYears > 110) throw new DomainError("assessment.errors.ageRange");

    const answers = buildAnswers(data);
    const risk = riskFromAnswers(answers, ageYears);
    const assessment = insertAssessment({ patientId: patient.id, assessedAt: assessedAt.toISOString(), ageYears, answers, risk }, actorId);
    writeAudit({ actorId, action: "create", entity: "assessment", entityId: assessment.id, patientId: patient.id, fields: Object.keys(answers) });

    // Follow-up: recommend referral for medium/high unless a referral is already in progress.
    const patch: { referralStatus?: ReferralStatus; nextReviewDate: string } = {
      nextReviewDate: nextReviewDate(new Date(`${today}T00:00:00Z`), risk.reviewInMonths),
    };
    const inProgress = patient.referralStatus === "referred" || patient.referralStatus === "recommended";
    if (risk.recommendation !== "routineFollowUp" && !inProgress) {
      patch.referralStatus = "recommended";
      insertReferral({ patientId: patient.id, status: "recommended", note: null, assessmentId: assessment.id }, actorId);
      writeAudit({ actorId, action: "create", entity: "referral", patientId: patient.id, fields: ["status"] });
    }
    updatePatientFollowUp(patient.id, patch, actorId);
    writeAudit({ actorId, action: "update", entity: "patient", entityId: patient.id, patientId: patient.id, fields: Object.keys(patch) });

    return { patient: getPatient(patient.id)!, assessment };
  });
}

export function recordSpirometry(form: SpirometryForm, actorId: string): SpirometryRecord {
  return transaction(() => {
    if (!form.patientId) throw new DomainError("assessment.errors.patientNotFound");
    const patient = getPatient(form.patientId);
    if (!patient) throw new DomainError("assessment.errors.patientNotFound");
    if (form.ageYears === null || form.heightCm === null || form.sex === null) throw new DomainError("spirometry.flags.demographicsMissing");
    const pre = form.pre.fev1L !== null && form.pre.fvcL !== null ? { fev1L: form.pre.fev1L, fvcL: form.pre.fvcL } : null;
    const post = form.post.fev1L !== null && form.post.fvcL !== null ? { fev1L: form.post.fev1L, fvcL: form.post.fvcL } : null;
    const ethnicity = DEFAULT_ETHNICITY;
    const interpretation = interpretSpirometry(
      { ageYears: form.ageYears, heightCm: form.heightCm, sex: form.sex, ethnicity, pre, post },
      { method: form.method, equationId: DEFAULT_REFERENCE_EQUATION },
    );
    const record = insertSpirometry(
      {
        patientId: patient.id,
        testedAt: form.testedAt,
        ageYears: form.ageYears,
        heightCm: form.heightCm,
        sex: form.sex,
        ethnicity,
        equationId: DEFAULT_REFERENCE_EQUATION,
        method: form.method,
        pre,
        post,
        interpretation,
      },
      actorId,
    );
    writeAudit({ actorId, action: "create", entity: "spirometry", entityId: record.id, patientId: patient.id, fields: ["pre", "post", "method", "testedAt"] });
    return record;
  });
}

export function updateFollowUp(
  input: { patientId: string; referralStatus?: ReferralStatus; note?: string | null; nextReviewDate?: string | null },
  actorId: string,
): void {
  transaction(() => {
    const patient = getPatient(input.patientId);
    if (!patient) throw new DomainError("assessment.errors.patientNotFound");
    const fields: string[] = [];
    if (input.referralStatus !== undefined && input.referralStatus !== patient.referralStatus) {
      insertReferral({ patientId: patient.id, status: input.referralStatus, note: input.note ?? null, assessmentId: null }, actorId);
      writeAudit({ actorId, action: "create", entity: "referral", patientId: patient.id, fields: input.note ? ["status", "note"] : ["status"] });
      fields.push("referralStatus");
    }
    if (input.nextReviewDate !== undefined && input.nextReviewDate !== patient.nextReviewDate) fields.push("nextReviewDate");
    if (fields.length === 0) return;
    updatePatientFollowUp(
      patient.id,
      {
        ...(fields.includes("referralStatus") ? { referralStatus: input.referralStatus } : {}),
        ...(fields.includes("nextReviewDate") ? { nextReviewDate: input.nextReviewDate ?? null } : {}),
      },
      actorId,
    );
    writeAudit({ actorId, action: "update", entity: "patient", entityId: patient.id, patientId: patient.id, fields });
  });
}
