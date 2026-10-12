import { z } from "zod";
import { REFERRAL_STATUSES } from "@/lib/domain/models";
import { isoDate } from "./common";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ error: "auth.invalid" }).max(200),
  password: z.string().min(1, { error: "auth.invalid" }).max(200),
});

export const followUpSchema = z.object({
  patientId: z.string().uuid(),
  referralStatus: z.enum(REFERRAL_STATUSES as [string, ...string[]]).optional(),
  note: z
    .string()
    .trim()
    .max(300)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  nextReviewDate: z.union([isoDate("assessment.errors.birthDateInvalid"), z.literal("").transform(() => null)]).nullable().optional(),
});

export const newUserSchema = z.object({
  name: z.string().trim().min(2, { error: "common.required" }).max(80),
  email: z.string().trim().toLowerCase().email({ error: "common.required" }).max(200),
  role: z.enum(["doctor", "admin"]),
  password: z.string().min(10, { error: "admin.passwordHint" }).max(200),
});
