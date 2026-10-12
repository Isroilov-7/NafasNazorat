import "server-only";
import { randomBytes, randomUUID } from "node:crypto";

export const newId = () => randomUUID();

/** Crockford base32 without ambiguous characters (no I, L, O, U). */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Random pseudonymous research ID, e.g. "NN-7K3Q-9XPA". Random — NOT derived
 * from name/DOB — so it cannot be reversed to identify the patient.
 */
export function newPseudoId(): string {
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
  return `NN-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

export const nowIso = () => new Date().toISOString();
