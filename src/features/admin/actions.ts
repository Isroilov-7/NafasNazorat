"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, failure, invalid } from "@/lib/server/actionResult";
import { requireAdmin } from "@/lib/server/auth/dal";
import { hashPassword } from "@/lib/server/auth/password";
import { writeAudit } from "@/lib/server/repositories/audit";
import { emailExists, insertUser } from "@/lib/server/repositories/users";
import { newUserSchema } from "@/lib/validation/misc";

export async function createUserAction(input: { name: string; email: string; role: string; password: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (emailExists(parsed.data.email)) return { ok: false, error: "common.fixErrors", fieldErrors: { email: "admin.emailTaken" } };
  try {
    const user = insertUser({ ...parsed.data, passwordHash: await hashPassword(parsed.data.password) });
    writeAudit({ actorId: admin.id, action: "create", entity: "user", entityId: user.id, fields: ["name", "email", "role"] });
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return failure(err, "createUser");
  }
}
