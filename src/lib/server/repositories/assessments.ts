import "server-only";
import type { RiskResult } from "@/lib/clinical";
import type { Assessment, AssessmentAnswers } from "@/lib/domain/models";
import { getDb } from "../db";
import { newId, nowIso } from "../ids";
import { toAssessment } from "../rows";

export function insertAssessment(
  input: { patientId: string; assessedAt: string; ageYears: number; answers: AssessmentAnswers; risk: RiskResult },
  actorId: string,
): Assessment {
  const id = newId();
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO assessments (id, patient_id, assessed_at, age_years, answers_json, risk_level, risk_score, risk_json,
         config_version, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.patientId, input.assessedAt, input.ageYears, JSON.stringify(input.answers), input.risk.level, input.risk.score, JSON.stringify(input.risk), input.risk.configVersion, actorId, actorId, now, now);
  return toAssessment(getDb().prepare("SELECT * FROM assessments WHERE id = ?").get(id)!);
}

export function listAssessments(patientId: string): Assessment[] {
  return getDb().prepare("SELECT * FROM assessments WHERE patient_id = ? ORDER BY assessed_at").all(patientId).map(toAssessment);
}

export function listAllAssessments(): Assessment[] {
  return getDb().prepare("SELECT * FROM assessments ORDER BY assessed_at").all().map(toAssessment);
}
