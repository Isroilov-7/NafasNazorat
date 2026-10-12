"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { burnPasswordCheck, verifyPassword } from "@/lib/server/auth/password";
import { RATE_LIMIT_WINDOW_MINUTES, clearAttempts, isRateLimited, recordAttempt } from "@/lib/server/auth/rateLimit";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/server/auth/token";
import { writeAudit } from "@/lib/server/repositories/audit";
import { findUserForLogin } from "@/lib/server/repositories/users";
import { loginSchema } from "@/lib/validation/misc";

export interface LoginState {
  error: "auth.invalid" | "auth.rateLimited" | null;
  minutes?: number;
  email?: string;
}

/** Only allow same-site relative redirects (no open redirect via ?next=). */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/dashboard";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
  if (!parsed.success) return { error: "auth.invalid", email };

  const ip = (await headers()).get("x-real-ip") ?? "local";
  const key = `${ip}|${parsed.data.email}`;
  if (isRateLimited(key, 5) || isRateLimited(ip, 30)) {
    return { error: "auth.rateLimited", minutes: RATE_LIMIT_WINDOW_MINUTES, email };
  }
  recordAttempt(key);
  recordAttempt(ip);

  const user = findUserForLogin(parsed.data.email);
  if (!user) {
    await burnPasswordCheck(parsed.data.password);
    return { error: "auth.invalid", email };
  }
  if (!user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "auth.invalid", email };
  }
  clearAttempts(key);

  (await cookies()).set(SESSION_COOKIE, createSessionToken({ uid: user.id, role: user.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  writeAudit({ actorId: user.id, action: "login", entity: "user", entityId: user.id });
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
