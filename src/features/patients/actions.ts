"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, failure, invalid } from "@/lib/server/actionResult";
import { requireClinician } from "@/lib/server/auth/dal";
import { updateFollowUp } from "@/lib/server/services/clinical";
import type { ReferralStatus } from "@/lib/domain/models";
import { followUpSchema } from "@/lib/validation/misc";

export async function updateFollowUpAction(input: {
  patientId: string;
  referralStatus?: string;
  note?: string;
  nextReviewDate?: string;
}): Promise<ActionResult> {
  const user = await requireClinician();
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    updateFollowUp(
      {
        patientId: parsed.data.patientId,
        ...(parsed.data.referralStatus ? { referralStatus: parsed.data.referralStatus as ReferralStatus } : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
        ...(parsed.data.nextReviewDate !== undefined ? { nextReviewDate: parsed.data.nextReviewDate } : {}),
      },
      user.id,
    );
    revalidatePath(`/patients/${parsed.data.patientId}`);
    return { ok: true };
  } catch (err) {
    return failure(err, "updateFollowUp");
  }
}
