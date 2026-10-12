import "server-only";
import type { Role, User } from "@/lib/domain/models";
import { getDb } from "../db";
import { newId, nowIso } from "../ids";
import { toUser } from "../rows";

export function findUserForLogin(email: string): (User & { passwordHash: string }) | null {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim());
  return row ? { ...toUser(row), passwordHash: String(row.password_hash) } : null;
}

export function getUser(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id);
  return row ? toUser(row) : null;
}

export function listUsers(): User[] {
  return getDb().prepare("SELECT * FROM users ORDER BY created_at").all().map(toUser);
}

export function countUsers(): number {
  return Number((getDb().prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c);
}

export function emailExists(email: string): boolean {
  return Boolean(getDb().prepare("SELECT 1 FROM users WHERE email = ?").get(email.trim()));
}

export function insertUser(input: { email: string; name: string; role: Role; passwordHash: string }): User {
  const id = newId();
  const now = nowIso();
  getDb()
    .prepare("INSERT INTO users (id, email, name, role, password_hash, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)")
    .run(id, input.email.trim(), input.name.trim(), input.role, input.passwordHash, now, now);
  return getUser(id)!;
}

/** id → display name, for "entered by" columns. */
export function userNames(): Map<string, string> {
  const rows = getDb().prepare("SELECT id, name FROM users").all() as { id: string; name: string }[];
  return new Map(rows.map((r) => [r.id, r.name]));
}
