import { z } from "zod";
import { isIsoDate } from "@/lib/domain/dates";

/**
 * Validation messages are i18n KEYS (e.g. "assessment.errors.ageRange"), not
 * text — the UI translates them. Schemas are shared by client (instant
 * feedback) and server actions (authoritative).
 */

/** Empty string / null / undefined → null; otherwise a finite number (accepts "1,5"). */
export const optionalNumber = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "string") return Number(v.replace(",", ".").trim());
  return v;
}, z.number().finite().nullable());

export const requiredNumber = (msg: string) =>
  z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    if (typeof v === "string") return Number(v.replace(",", ".").trim());
    return v;
  }, z.number({ error: msg }).finite({ error: msg }));

export const isoDate = (msg: string) => z.string({ error: msg }).refine(isIsoDate, { error: msg });

export const sexSchema = z.enum(["male", "female"], { error: "assessment.errors.sexRequired" });

/** Flatten zod issues to { "path.to.field": "i18n.key" } (first issue per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
