import "server-only";
import type { z } from "zod";
import { fieldErrors } from "@/lib/validation/common";
import { DomainError } from "./services/clinical";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function invalid(error: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  return { ok: false, error: "common.fixErrors", fieldErrors: fieldErrors(error) };
}

/** Maps thrown errors to a safe i18n key. Logs only the error class/code — never payloads (PII). */
export function failure(err: unknown, context: string): { ok: false; error: string } {
  if (err instanceof DomainError) return { ok: false, error: err.code };
  console.error(`[${context}] ${err instanceof Error ? err.name : "UnknownError"}`);
  return { ok: false, error: "common.unknownError" };
}
