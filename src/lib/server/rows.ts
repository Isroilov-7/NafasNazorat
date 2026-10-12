import "server-only";
import type { Assessment, AuditEvent, Patient, Referral, SpirometryRecord, User } from "@/lib/domain/models";

/* Row ↔ model mappers (snake_case SQL → typed camelCase models). */

type Row = Record<string, unknown>;
const s = (v: unknown) => v as string;
const sn = (v: unknown) => (v === null || v === undefined ? null : (v as string));
const n = (v: unknown) => Number(v);
const nn = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function toUser(r: Row): User {
  return { id: s(r.id), email: s(r.email), name: s(r.name), role: s(r.role) as User["role"], active: n(r.active) === 1, createdAt: s(r.created_at) };
}

export function toPatient(r: Row): Patient {
  return {
    id: s(r.id),
    pseudoId: s(r.pseudo_id),
    fullName: s(r.full_name),
    birthDate: s(r.birth_date),
    sex: s(r.sex) as Patient["sex"],
    phone: sn(r.phone),
    consentResearch: n(r.consent_research) === 1,
    consentAt: sn(r.consent_at),
    referralStatus: s(r.referral_status) as Patient["referralStatus"],
    nextReviewDate: sn(r.next_review_date),
    createdBy: s(r.created_by),
    updatedBy: s(r.updated_by),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
  };
}

export function toAssessment(r: Row): Assessment {
  return {
    id: s(r.id),
    patientId: s(r.patient_id),
    assessedAt: s(r.assessed_at),
    ageYears: n(r.age_years),
    answers: JSON.parse(s(r.answers_json)),
    risk: JSON.parse(s(r.risk_json)),
    createdBy: s(r.created_by),
    updatedBy: s(r.updated_by),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
  };
}

export function toSpirometry(r: Row): SpirometryRecord {
  const pair = (f: unknown, v: unknown) => (f === null || v === null ? null : { fev1L: n(f), fvcL: n(v) });
  return {
    id: s(r.id),
    patientId: s(r.patient_id),
    testedAt: s(r.tested_at),
    ageYears: n(r.age_years),
    heightCm: n(r.height_cm),
    sex: s(r.sex) as SpirometryRecord["sex"],
    ethnicity: s(r.ethnicity) as SpirometryRecord["ethnicity"],
    equationId: s(r.equation_id) as SpirometryRecord["equationId"],
    method: s(r.method) as SpirometryRecord["method"],
    pre: pair(r.pre_fev1, r.pre_fvc),
    post: pair(r.post_fev1, r.post_fvc),
    interpretation: JSON.parse(s(r.interpretation_json)),
    createdBy: s(r.created_by),
    updatedBy: s(r.updated_by),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
  };
}

export function toReferral(r: Row): Referral {
  return {
    id: s(r.id),
    patientId: s(r.patient_id),
    status: s(r.status) as Referral["status"],
    note: sn(r.note),
    assessmentId: sn(r.assessment_id),
    createdBy: s(r.created_by),
    createdAt: s(r.created_at),
  };
}

export function toAuditEvent(r: Row): AuditEvent {
  return {
    id: s(r.id),
    at: s(r.at),
    actorId: s(r.actor_id),
    actorName: sn(r.actor_name) ?? "—",
    action: s(r.action) as AuditEvent["action"],
    entity: s(r.entity) as AuditEvent["entity"],
    entityId: sn(r.entity_id),
    patientId: sn(r.patient_id),
    fields: JSON.parse(s(r.fields_json)),
  };
}

export { nn as numOrNull };
