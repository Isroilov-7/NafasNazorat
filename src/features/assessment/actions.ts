"use server";

import { type ActionResult, failure, invalid } from "@/lib/server/actionResult";
import { requireClinician } from "@/lib/server/auth/dal";
import { getPatient } from "@/lib/server/repositories/patients";
import { recordAssessment } from "@/lib/server/services/clinical";
import { ageOn, todayInClinic } from "@/lib/domain/dates";
import { type AssessmentPayload, assessmentPayloadSchema, exposureYearsExceedAge } from "@/lib/validation/assessment";

export async function saveAssessmentAction(payload: AssessmentPayload): Promise<ActionResult<{ patientId: string }>> {
  const user = await requireClinician();
  const parsed = assessmentPayloadSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  const birthDate = data.patient.mode === "new" ? data.patient.birthDate : getPatient(data.patient.patientId)?.birthDate;
  if (!birthDate) return { ok: false, error: "assessment.errors.patientNotFound" };
  const age = ageOn(birthDate, todayInClinic());
  if (age < 18 || age > 110) return { ok: false, error: "common.fixErrors", fieldErrors: { "patient.birthDate": "assessment.errors.ageRange" } };
  const tooLong = exposureYearsExceedAge(data, age);
  if (tooLong.length) {
    return { ok: false, error: "common.fixErrors", fieldErrors: Object.fromEntries(tooLong.map((f) => [f, "assessment.errors.yearsExceedAge"])) };
  }

  try {
    const { patient } = recordAssessment(data, user.id);
    return { ok: true, data: { patientId: patient.id } };
  } catch (err) {
    return failure(err, "saveAssessment");
  }
}
