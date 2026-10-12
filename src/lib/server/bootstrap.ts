import "server-only";
import { randomBytes } from "node:crypto";
import type { CatItemKey, MmrcGrade, SmokingStatus } from "@/lib/clinical";
import { CAT_ITEM_KEYS } from "@/lib/clinical";
import type { Role } from "@/lib/domain/models";
import { assessmentPayloadSchema } from "@/lib/validation/assessment";
import { spirometryFormSchema } from "@/lib/validation/spirometry";
import { ageOn, todayInClinic } from "@/lib/domain/dates";
import { hashPasswordSync } from "./auth/password";
import { newId, newPseudoId, nowIso } from "./ids";
import { getDb } from "./db";
import { countUsers, emailExists, insertUser, listUsers } from "./repositories/users";
import { recordAssessment, recordSpirometry, updateFollowUp } from "./services/clinical";

/**
 * First-run setup, driven by environment variables (never hard-coded secrets):
 *   BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD — first admin account
 *   DEMO_DOCTOR_EMAIL / DEMO_DOCTOR_PASSWORD         — reviewer/demo doctor
 *   NAFAS_DEMO_DATA=1                                — fictional demo patients
 * In development without env vars, accounts get random passwords printed once.
 */
export function bootstrap(): void {
  const dev = process.env.NODE_ENV !== "production";
  ensureUser("admin", "Administrator", process.env.BOOTSTRAP_ADMIN_EMAIL ?? (dev ? "admin@nafas.local" : undefined), process.env.BOOTSTRAP_ADMIN_PASSWORD, dev);
  ensureUser("doctor", "Demo shifokor", process.env.DEMO_DOCTOR_EMAIL ?? (dev ? "doctor@nafas.local" : undefined), process.env.DEMO_DOCTOR_PASSWORD, dev);
  if (countUsers() === 0) console.warn("[bootstrap] No users. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.");
  if (process.env.NAFAS_DEMO_DATA === "1") seedDemoData();
}

function ensureUser(role: Role, name: string, email: string | undefined, password: string | undefined, dev: boolean) {
  if (!email || emailExists(email)) return;
  let pwd = password;
  if (!pwd || pwd.length < 10) {
    if (!dev) {
      console.warn(`[bootstrap] Skipping ${role} account: password missing or shorter than 10 characters.`);
      return;
    }
    pwd = randomBytes(9).toString("base64url");
    console.info(`[bootstrap] DEV ${role} account created: ${email} / ${pwd}`);
  }
  insertUser({ email, name, role, passwordHash: hashPasswordSync(pwd) });
}

/* ───────────── Demo data (fictional patients for the pilot / review site) ───────────── */

export const isDemoMode = () => process.env.NAFAS_DEMO_DATA === "1";

interface DemoVisit {
  daysAgo: number;
  smoking: [SmokingStatus, number | null, number | null];
  biomass?: number;
  occupational?: number;
  symptoms: [boolean, boolean, boolean];
  mmrc: MmrcGrade;
  cat: number;
  heightCm: number;
}

interface DemoPatient {
  fullName: string;
  birthDate: string;
  sex: "male" | "female";
  consent: boolean;
  visits: DemoVisit[];
  spirometry?: { daysAgo: number; pre?: [number, number]; post: [number, number] };
  referral?: "referred" | "completed";
}

/** Spread a CAT total across the 8 items deterministically. */
function catItems(total: number): Record<CatItemKey, number> {
  const out = {} as Record<CatItemKey, number>;
  CAT_ITEM_KEYS.forEach((k, i) => {
    out[k] = Math.min(5, Math.floor(total / 8) + (i < total % 8 ? 1 : 0));
  });
  return out;
}

const DEMO: DemoPatient[] = [
  {
    fullName: "Rahimov Baxtiyor", birthDate: "1962-03-14", sex: "male", consent: true,
    visits: [
      { daysAgo: 240, smoking: ["current", 25, 34], symptoms: [true, true, true], mmrc: 2, cat: 16, heightCm: 172 },
      { daysAgo: 14, smoking: ["current", 25, 35], symptoms: [true, true, true], mmrc: 3, cat: 22, heightCm: 172 },
    ],
    spirometry: { daysAgo: 9, pre: [1.52, 3.22], post: [1.64, 3.31] },
    referral: "referred",
  },
  {
    fullName: "Yusupova Mohira", birthDate: "1958-07-02", sex: "female", consent: true,
    visits: [{ daysAgo: 20, smoking: ["never", null, null], biomass: 35, symptoms: [true, true, true], mmrc: 2, cat: 15, heightCm: 158 }],
  },
  {
    fullName: "Karimov Jasur", birthDate: "1985-11-20", sex: "male", consent: false,
    visits: [{ daysAgo: 60, smoking: ["former", 10, 8], symptoms: [false, false, false], mmrc: 0, cat: 4, heightCm: 178 }],
  },
  {
    fullName: "Tursunova Gulnora", birthDate: "1970-01-09", sex: "female", consent: true,
    visits: [{ daysAgo: 45, smoking: ["never", null, null], occupational: 22, symptoms: [true, false, false], mmrc: 1, cat: 11, heightCm: 161 }],
  },
  {
    fullName: "Abdullayev Sherzod", birthDate: "1966-05-30", sex: "male", consent: true,
    visits: [
      { daysAgo: 400, smoking: ["current", 20, 28], symptoms: [false, false, true], mmrc: 1, cat: 7, heightCm: 175 },
      { daysAgo: 150, smoking: ["current", 20, 29], symptoms: [true, false, true], mmrc: 1, cat: 9, heightCm: 175 },
    ],
  },
  {
    fullName: "Nazarova Dilfuza", birthDate: "1990-08-15", sex: "female", consent: false,
    visits: [{ daysAgo: 30, smoking: ["never", null, null], symptoms: [false, false, false], mmrc: 0, cat: 2, heightCm: 164 }],
  },
  {
    fullName: "Ismoilov Odil", birthDate: "1950-02-11", sex: "male", consent: true,
    visits: [
      { daysAgo: 330, smoking: ["former", 20, 38], symptoms: [true, true, true], mmrc: 3, cat: 26, heightCm: 168 },
      { daysAgo: 35, smoking: ["former", 20, 40], symptoms: [true, true, true], mmrc: 4, cat: 31, heightCm: 168 },
    ],
    spirometry: { daysAgo: 28, pre: [0.98, 2.61], post: [1.05, 2.66] },
    referral: "completed",
  },
];

function seedDemoData() {
  const existing = Number((getDb().prepare("SELECT COUNT(*) AS c FROM patients").get() as { c: number }).c);
  if (existing > 0) return;
  const actor = listUsers().find((u) => u.role === "doctor") ?? listUsers()[0];
  if (!actor) return;
  const day = 86_400_000;

  for (const p of DEMO) {
    let patientId: string | null = null;
    for (const v of p.visits) {
      const data = assessmentPayloadSchema.parse({
        patient: patientId
          ? { mode: "existing", patientId }
          : { mode: "new", fullName: p.fullName, birthDate: p.birthDate, sex: p.sex, phone: "", consentResearch: p.consent },
        heightCm: v.heightCm,
        weightKg: null,
        smoking: { status: v.smoking[0], cigarettesPerDay: v.smoking[1], yearsSmoked: v.smoking[2] },
        biomass: { exposed: v.biomass !== undefined, years: v.biomass ?? null },
        occupational: { exposed: v.occupational !== undefined, years: v.occupational ?? null },
        symptoms: { chronicCough: v.symptoms[0], sputum: v.symptoms[1], dyspnea: v.symptoms[2] },
        mmrc: v.mmrc,
        catItems: catItems(v.cat),
      });
      const { patient } = recordAssessment(data, actor.id, new Date(Date.now() - v.daysAgo * day));
      patientId = patient.id;
    }
    if (patientId && p.spirometry) {
      const s = p.spirometry;
      const testedAt = todayInClinic(new Date(Date.now() - s.daysAgo * day));
      recordSpirometry(
        spirometryFormSchema.parse({
          patientId,
          testedAt,
          ageYears: ageOn(p.birthDate, testedAt),
          heightCm: p.visits.at(-1)!.heightCm,
          sex: p.sex,
          method: "fixedRatio",
          pre: { fev1L: s.pre?.[0] ?? null, fvcL: s.pre?.[1] ?? null },
          post: { fev1L: s.post[0], fvcL: s.post[1] },
        }),
        actor.id,
      );
    }
    if (patientId && p.referral) updateFollowUp({ patientId, referralStatus: p.referral, note: null }, actor.id);
  }
  // One registered patient not yet assessed (shows the "not assessed" state).
  getDb()
    .prepare(
      `INSERT INTO patients (id, pseudo_id, full_name, birth_date, sex, phone, consent_research, consent_at, referral_status,
         next_review_date, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, 'Ergasheva Malika', '1975-12-03', 'female', NULL, 0, NULL, 'none', NULL, ?, ?, ?, ?)`,
    )
    .run(newId(), newPseudoId(), actor.id, actor.id, nowIso(), nowIso());
  console.info(`[bootstrap] Demo data created (${DEMO.length + 1} fictional patients).`);
}
