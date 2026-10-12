import "server-only";
import type { SpirometryRecord } from "@/lib/domain/models";
import { getDb } from "../db";
import { newId, nowIso } from "../ids";
import { toSpirometry } from "../rows";

export type NewSpirometry = Omit<SpirometryRecord, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt">;

export function insertSpirometry(input: NewSpirometry, actorId: string): SpirometryRecord {
  const id = newId();
  const now = nowIso();
  const i = input.interpretation;
  getDb()
    .prepare(
      `INSERT INTO spirometry_results (id, patient_id, tested_at, age_years, height_cm, sex, ethnicity, equation_id, method,
         pre_fev1, pre_fvc, post_fev1, post_fvc, obstruction, gold_grade, interpretation_json,
         created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id, input.patientId, input.testedAt, input.ageYears, input.heightCm, input.sex, input.ethnicity, input.equationId, input.method,
      input.pre?.fev1L ?? null, input.pre?.fvcL ?? null, input.post?.fev1L ?? null, input.post?.fvcL ?? null,
      i.obstruction, i.goldGrade, JSON.stringify(i), actorId, actorId, now, now,
    );
  return toSpirometry(getDb().prepare("SELECT * FROM spirometry_results WHERE id = ?").get(id)!);
}

export function listSpirometry(patientId: string): SpirometryRecord[] {
  return getDb().prepare("SELECT * FROM spirometry_results WHERE patient_id = ? ORDER BY tested_at, created_at").all(patientId).map(toSpirometry);
}

export function listAllSpirometry(): SpirometryRecord[] {
  return getDb().prepare("SELECT * FROM spirometry_results ORDER BY tested_at").all().map(toSpirometry);
}
