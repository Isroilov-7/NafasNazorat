import "server-only";

/** Demo / review mode: fictional patients + banner. */
export const isDemoMode = () => process.env.NAFAS_DEMO_DATA === "1";

/**
 * Email of the demo doctor usable for password-less "view the demo" login —
 * only when demo data AND demo login are both explicitly enabled. Never enable
 * on a site that holds real patient data.
 */
export function demoDoctorEmail(): string | null {
  if (!isDemoMode() || process.env.NAFAS_DEMO_LOGIN !== "1") return null;
  return process.env.DEMO_DOCTOR_EMAIL?.trim() || null;
}
