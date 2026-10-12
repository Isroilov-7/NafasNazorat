import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/domain/models";

/**
 * Stateless signed session token: base64url(JSON payload) + "." + HMAC-SHA256.
 * No PII in the payload (user id + role only). Shared by the proxy (optimistic
 * redirect) and the data-access layer (authoritative check against the DB).
 */

export const SESSION_COOKIE = "nn_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // one clinic shift

export interface SessionPayload {
  uid: string;
  role: Role;
  exp: number; // unix seconds
}

let warned = false;
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (≥ 32 chars) in production");
  }
  if (!warned) {
    warned = true;
    console.warn("[auth] SESSION_SECRET not set — using an insecure development secret.");
  }
  return "dev-only-insecure-session-secret-change-me-please";
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">, now = Date.now()): string {
  const full: SessionPayload = { ...payload, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
