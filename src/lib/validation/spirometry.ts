import { z } from "zod";
import { VOLUME_BOUNDS_L } from "@/lib/clinical";
import { isoDate, optionalNumber, sexSchema } from "./common";

const volume = optionalNumber.pipe(
  z.number().min(VOLUME_BOUNDS_L.min, { error: "spirometry.errors.volumeRange" }).max(VOLUME_BOUNDS_L.max, { error: "spirometry.errors.volumeRange" }).nullable(),
);

const pair = z
  .object({ fev1L: volume, fvcL: volume })
  .superRefine((p, ctx) => {
    if ((p.fev1L === null) !== (p.fvcL === null)) {
      ctx.addIssue({ code: "custom", path: [p.fev1L === null ? "fev1L" : "fvcL"], message: "spirometry.errors.pairIncomplete" });
    }
  });

export const spirometryFormSchema = z
  .object({
    patientId: z.string().uuid().nullable(),
    testedAt: isoDate("assessment.errors.birthDateInvalid"),
    ageYears: optionalNumber.pipe(z.number().int().min(18, { error: "assessment.errors.ageRange" }).max(110, { error: "assessment.errors.ageRange" }).nullable()),
    heightCm: optionalNumber.pipe(z.number().min(120, { error: "assessment.errors.heightRange" }).max(220, { error: "assessment.errors.heightRange" }).nullable()),
    sex: sexSchema.nullable(),
    method: z.enum(["fixedRatio", "lln"]),
    pre: pair,
    post: pair,
  })
  .superRefine((v, ctx) => {
    if (v.pre.fev1L === null && v.post.fev1L === null) {
      ctx.addIssue({ code: "custom", path: ["post", "fev1L"], message: "spirometry.errors.noPair" });
    }
  });

export type SpirometryForm = z.output<typeof spirometryFormSchema>;
export type SpirometryFormInput = z.input<typeof spirometryFormSchema>;

/** Saving to a patient card additionally requires complete demographics. */
export const spirometrySaveSchema = spirometryFormSchema.superRefine((v, ctx) => {
  if (!v.patientId) ctx.addIssue({ code: "custom", path: ["patientId"], message: "assessment.errors.patientNotFound" });
  if (v.ageYears === null) ctx.addIssue({ code: "custom", path: ["ageYears"], message: "assessment.errors.ageRange" });
  if (v.heightCm === null) ctx.addIssue({ code: "custom", path: ["heightCm"], message: "assessment.errors.heightRange" });
  if (v.sex === null) ctx.addIssue({ code: "custom", path: ["sex"], message: "assessment.errors.sexRequired" });
});
