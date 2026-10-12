import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { CLINICAL_ROLES, type User } from "@/lib/domain/models";
import { getUser } from "../repositories/users";
import { SESSION_COOKIE, verifySessionToken } from "./token";

/**
 * Data Access Layer: the authoritative auth check (the proxy only does an
 * optimistic redirect). Every page and server action that touches patient data
 * calls `requireClinician()` / `requireAdmin()` first.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  // Request-time only: session expiry compares against the clock, and the
  // synchronous SQLite reads that follow must never run during prerender.
  await connection();
  const payload = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = getUser(payload.uid);
  return user?.active ? user : null;
});

export async function requireClinician(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(CLINICAL_ROLES as readonly string[]).includes(user.role)) redirect("/login?error=role");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireClinician();
  if (user.role !== "admin") redirect("/dashboard?error=forbidden");
  return user;
}
