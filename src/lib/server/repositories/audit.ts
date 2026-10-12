import "server-only";
import type { AuditAction, AuditEntity, AuditEvent } from "@/lib/domain/models";
import { getDb } from "../db";
import { newId, nowIso } from "../ids";
import { toAuditEvent } from "../rows";

export interface AuditInput {
  actorId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  patientId?: string | null;
  /** Field NAMES only — never values (keeps PII out of the log). */
  fields?: string[];
}

export function writeAudit(input: AuditInput): void {
  getDb()
    .prepare(
      `INSERT INTO audit_events (id, at, actor_id, action, entity, entity_id, patient_id, fields_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(newId(), nowIso(), input.actorId, input.action, input.entity, input.entityId ?? null, input.patientId ?? null, JSON.stringify(input.fields ?? []));
}

const SELECT = `SELECT a.*, u.name AS actor_name FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id`;

export function listAuditForPatient(patientId: string, limit = 50): AuditEvent[] {
  return getDb().prepare(`${SELECT} WHERE a.patient_id = ? ORDER BY a.at DESC LIMIT ?`).all(patientId, limit).map(toAuditEvent);
}

export function listRecentAudit(limit = 30): AuditEvent[] {
  return getDb().prepare(`${SELECT} ORDER BY a.at DESC LIMIT ?`).all(limit).map(toAuditEvent);
}
