import "server-only";
import type { Referral, ReferralStatus } from "@/lib/domain/models";
import { getDb } from "../db";
import { newId, nowIso } from "../ids";
import { toReferral } from "../rows";

export function insertReferral(
  input: { patientId: string; status: ReferralStatus; note: string | null; assessmentId: string | null },
  actorId: string,
): Referral {
  const id = newId();
  getDb()
    .prepare("INSERT INTO referrals (id, patient_id, status, note, assessment_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, input.patientId, input.status, input.note, input.assessmentId, actorId, nowIso());
  return toReferral(getDb().prepare("SELECT * FROM referrals WHERE id = ?").get(id)!);
}

export function listReferrals(patientId: string): Referral[] {
  return getDb().prepare("SELECT * FROM referrals WHERE patient_id = ? ORDER BY created_at DESC").all(patientId).map(toReferral);
}
