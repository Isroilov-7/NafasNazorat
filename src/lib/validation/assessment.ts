import { z } from "zod";
import { CAT_ITEM_KEYS } from "@/lib/clinical";
import { isoDate, optionalNumber, requiredNumber, sexSchema } from "./common";

const E = "assessment.errors";

export const AGE_MIN = 18;
export const AGE_MAX = 110;

export const newPatientSchema = z.object({
  mode: z.literal("new"),
  fullName: z.string().trim().min(3, { error: `${E}.nameRequired` }).max(120, { error: `${E}.nameRequired` }),
  birthDate: isoDate(`${E}.birthDateInvalid`),
  sex: sexSchema,
  phone: z
    .string()
    .trim()
    .max(32)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  consentResearch: z.boolean().default(false),
});

export const patientRefSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), patientId: z.string().uuid({ error: `${E}.patientNotFound` }) }),
  newPatientSchema,
]);

export const patientStepSchema = z.object({
  patient: patientRefSchema,
  heightCm: requiredNumber(`${E}.heightRange`).pipe(z.number().min(120, { error: `${E}.heightRange` }).max(220, { error: `${E}.heightRange` })),
  weightKg: optionalNumber.pipe(z.number().min(25, { error: `${E}.weightRange` }).max(250, { error: `${E}.weightRange` }).nullable()),
});

const years = optionalNumber.pipe(z.number().min(0, { error: `${E}.yearsRange` }).max(80, { error: `${E}.yearsRange` }).nullable());

export const exposuresStepSchema = z
  .object({
    smoking: z.object({
      status: z.enum(["never", "former", "current"], { error: `${E}.smokingRequired` }),
      cigarettesPerDay: optionalNumber.pipe(z.number().min(0, { error: `${E}.cigarettesRange` }).max(100, { error: `${E}.cigarettesRange` }).nullable()),
      yearsSmoked: years,
    }),
    biomass: z.object({ exposed: z.boolean({ error: `${E}.answerRequired` }), years }),
    occupational: z.object({ exposed: z.boolean({ error: `${E}.answerRequired` }), years }),
  })
  .superRefine((v, ctx) => {
    if (v.smoking.status !== "never") {
      if (v.smoking.cigarettesPerDay === null) ctx.addIssue({ code: "custom", path: ["smoking", "cigarettesPerDay"], message: `${E}.cigarettesRange` });
      if (v.smoking.yearsSmoked === null) ctx.addIssue({ code: "custom", path: ["smoking", "yearsSmoked"], message: `${E}.yearsRange` });
    }
  });

export const symptomsStepSchema = z.object({
  symptoms: z.object({
    chronicCough: z.boolean({ error: `${E}.answerRequired` }),
    sputum: z.boolean({ error: `${E}.answerRequired` }),
    dyspnea: z.boolean({ error: `${E}.answerRequired` }),
  }),
});

const catItem = z.number({ error: `${E}.catIncomplete` }).int().min(0).max(5);

export const scoresStepSchema = z.object({
  mmrc: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)], { error: `${E}.mmrcRequired` }),
  catItems: z.object(Object.fromEntries(CAT_ITEM_KEYS.map((k) => [k, catItem])) as Record<(typeof CAT_ITEM_KEYS)[number], typeof catItem>, {
    error: `${E}.catIncomplete`,
  }),
});

export const assessmentPayloadSchema = patientStepSchema
  .extend(symptomsStepSchema.shape)
  .extend(scoresStepSchema.shape)
  .and(exposuresStepSchema);

export type AssessmentPayload = z.input<typeof assessmentPayloadSchema>;
export type AssessmentData = z.output<typeof assessmentPayloadSchema>;

/** Exposure durations cannot exceed the patient's age (checked once age is known). */
export function exposureYearsExceedAge(data: Pick<AssessmentData, "smoking" | "biomass" | "occupational">, ageYears: number): string[] {
  const bad: string[] = [];
  if (data.smoking.status !== "never" && (data.smoking.yearsSmoked ?? 0) > ageYears) bad.push("smoking.yearsSmoked");
  if (data.biomass.exposed && (data.biomass.years ?? 0) > ageYears) bad.push("biomass.years");
  if (data.occupational.exposed && (data.occupational.years ?? 0) > ageYears) bad.push("occupational.years");
  return bad;
}
