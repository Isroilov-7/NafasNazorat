import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { bootstrap } from "./bootstrap";

/**
 * SQLite storage (Node's built-in `node:sqlite`, no native build step) — one
 * file, trivially backed up, ~0 MB idle RAM: right-sized for a pilot on a
 * shared server. All access goes through the repositories in ./repositories,
 * so moving to PostgreSQL later only touches this layer.
 */

const MIGRATIONS: string[] = [
  /* 1 */ `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor','admin','patient','researcher')),
    password_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    pseudo_id TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('male','female')),
    phone TEXT,
    consent_research INTEGER NOT NULL DEFAULT 0,
    consent_at TEXT,
    referral_status TEXT NOT NULL DEFAULT 'none',
    next_review_date TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE assessments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    assessed_at TEXT NOT NULL,
    age_years INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high')),
    risk_score INTEGER NOT NULL,
    risk_json TEXT NOT NULL,
    config_version TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_assessments_patient ON assessments(patient_id, assessed_at);
  CREATE TABLE spirometry_results (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    tested_at TEXT NOT NULL,
    age_years INTEGER NOT NULL,
    height_cm REAL NOT NULL,
    sex TEXT NOT NULL,
    ethnicity TEXT NOT NULL,
    equation_id TEXT NOT NULL,
    method TEXT NOT NULL,
    pre_fev1 REAL, pre_fvc REAL, post_fev1 REAL, post_fvc REAL,
    obstruction TEXT NOT NULL,
    gold_grade INTEGER,
    interpretation_json TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_spirometry_patient ON spirometry_results(patient_id, tested_at);
  CREATE TABLE referrals (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    status TEXT NOT NULL,
    note TEXT,
    assessment_id TEXT REFERENCES assessments(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_referrals_patient ON referrals(patient_id, created_at);
  CREATE TABLE audit_events (
    id TEXT PRIMARY KEY,
    at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    patient_id TEXT,
    fields_json TEXT NOT NULL DEFAULT '[]'
  );
  CREATE INDEX idx_audit_patient ON audit_events(patient_id, at);
  CREATE INDEX idx_audit_at ON audit_events(at);
  `,
];

function migrate(db: DatabaseSync) {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

function open(): DatabaseSync {
  const file = resolve(/*turbopackIgnore: true*/ process.env.NAFAS_DB_PATH ?? ".data/nafasnazorat.db");
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(db);
  return db;
}

// Survive dev hot-reloads without leaking connections.
const globalForDb = globalThis as unknown as { __nafasDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__nafasDb) {
    globalForDb.__nafasDb = open();
    bootstrap(); // first-run accounts / demo data; uses repositories → getDb()
  }
  return globalForDb.__nafasDb;
}

/** Runs `fn` in a transaction (all-or-nothing: record + audit entry). */
export function transaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
