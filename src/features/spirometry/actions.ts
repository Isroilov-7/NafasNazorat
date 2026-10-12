"use server";

import { type ActionResult, failure, invalid } from "@/lib/server/actionResult";
import { requireClinician } from "@/lib/server/auth/dal";
import { recordSpirometry } from "@/lib/server/services/clinical";
import { type SpirometryFormInput, spirometrySaveSchema } from "@/lib/validation/spirometry";

export async function saveSpirometryAction(payload: SpirometryFormInput): Promise<ActionResult<{ patientId: string }>> {
  const user = await requireClinician();
  const parsed = spirometrySaveSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const record = recordSpirometry(parsed.data, user.id);
    return { ok: true, data: { patientId: record.patientId } };
  } catch (err) {
    return failure(err, "saveSpirometry");
  }
}
