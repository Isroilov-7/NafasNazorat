import "server-only";
import type { RiskLevel, Sex } from "@/lib/clinical";
import type { Patient, PatientListItem, ReferralStatus } from "@/lib/domain/models";
import { getDb } from "../db";
import { newId, newPseudoId, nowIso } from "../ids";
import { toPatient } from "../rows";

export interface NewPatient {
  fullName: string;
  birthDate: string;
  sex: Sex;
  phone: string | null;
  consentResearch: boolean;
}

export function insertPatient(input: NewPatient, actorId: string): Patient {
  const id = newId();
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO patients (id, pseudo_id, full_name, birth_date, sex, phone, consent_research, consent_at,
         referral_status, next_review_date, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'none', NULL, ?, ?, ?, ?)`,
    )
    .run(id, newPseudoId(), input.fullName.trim(), input.birthDate, input.sex, input.phone, input.consentResearch ? 1 : 0, input.consentResearch ? now : null, actorId, actorId, now, now);
  return getPatient(id)!;
}

export function getPatient(id: string): Patient | null {
  const row = getDb().prepare("SELECT * FROM patients WHERE id = ?").get(id);
  return row ? toPatient(row) : null;
}

export function listAllPatients(): Patient[] {
  return getDb().prepare("SELECT * FROM patients ORDER BY created_at").all().map(toPatient);
}

export function updatePatientFollowUp(
  patientId: string,
  patch: { referralStatus?: ReferralStatus; nextReviewDate?: string | null },
  actorId: string,
): void {
  const sets: string[] = [];
  const args: (string | null)[] = [];
  if (patch.referralStatus !== undefined) {
    sets.push("referral_status = ?");
    args.push(patch.referralStatus);
  }
  if (patch.nextReviewDate !== undefined) {
    sets.push("next_review_date = ?");
    args.push(patch.nextReviewDate);
  }
  if (sets.length === 0) return;
  getDb()
    .prepare(`UPDATE patients SET ${sets.join(", ")}, updated_by = ?, updated_at = ? WHERE id = ?`)
    .run(...args, actorId, nowIso(), patientId);
}

export interface PatientFilters {
  risk?: RiskLevel | "none";
  referral?: ReferralStatus;
  q?: string;
}

const LATEST = `
  SELECT a.patient_id, a.assessed_at, a.risk_level, a.risk_score
  FROM assessments a
  WHERE a.assessed_at = (SELECT MAX(a2.assessed_at) FROM assessments a2 WHERE a2.patient_id = a.patient_id)`;

export function listPatients(filters: PatientFilters = {}): PatientListItem[] {
  const where: string[] = [];
  const args: string[] = [];
  if (filters.risk === "none") where.push("l.risk_level IS NULL");
  else if (filters.risk) {
    where.push("l.risk_level = ?");
    args.push(filters.risk);
  }
  if (filters.referral) {
    where.push("p.referral_status = ?");
    args.push(filters.referral);
  }
  const q = filters.q?.trim();
  if (q) {
    where.push("(p.full_name LIKE ? ESCAPE '\\' OR p.pseudo_id LIKE ? ESCAPE '\\')");
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    args.push(like, like);
  }
  const sql = `
    SELECT p.id, p.pseudo_id, p.full_name, p.birth_date, p.sex, p.referral_status, p.next_review_date,
           l.assessed_at, l.risk_level, l.risk_score
    FROM patients p LEFT JOIN (${LATEST}) l ON l.patient_id = p.id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY CASE l.risk_level WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
             COALESCE(p.next_review_date, '9999-12-31'), p.full_name
    LIMIT 500`;
  return getDb()
    .prepare(sql)
    .all(...args)
    .map((r) => ({
      id: String(r.id),
      pseudoId: String(r.pseudo_id),
      fullName: String(r.full_name),
      birthDate: String(r.birth_date),
      sex: r.sex as Sex,
      referralStatus: r.referral_status as ReferralStatus,
      nextReviewDate: (r.next_review_date as string | null) ?? null,
      lastAssessedAt: (r.assessed_at as string | null) ?? null,
      lastRiskLevel: (r.risk_level as RiskLevel | null) ?? null,
      lastRiskScore: r.risk_score === null ? null : Number(r.risk_score),
    }));
}

export function dashboardStats(today: string) {
  const db = getDb();
  const one = (sql: string, ...args: string[]) => Number((db.prepare(sql).get(...args) as { c: number }).c);
  return {
    patients: one("SELECT COUNT(*) AS c FROM patients"),
    high: one(`SELECT COUNT(*) AS c FROM (${LATEST}) l WHERE l.risk_level = 'high'`),
    overdue: one("SELECT COUNT(*) AS c FROM patients WHERE next_review_date IS NOT NULL AND next_review_date < ?", today),
    pendingReferrals: one("SELECT COUNT(*) AS c FROM patients WHERE referral_status = 'recommended'"),
  };
}
