import { CAT_ITEM_KEYS, type CatItemKey, type RiskResult, computeRisk, packYears, parseMmrc, scoreCat } from "@/lib/clinical";
import { ageOn } from "@/lib/domain/dates";
import type { AssessmentPayload } from "@/lib/validation/assessment";

/**
 * Wizard form state: raw strings exactly as typed (so inputs never "jump"),
 * converted to the typed payload only when validating / submitting.
 * Deliberately NOT persisted to browser storage (it contains PII).
 */

export type YesNo = "" | "yes" | "no";

export interface PatientSummary {
  id: string;
  pseudoId: string;
  fullName: string;
  birthDate: string;
  sex: "male" | "female";
  lastHeightCm: number | null;
}

export interface WizardState {
  existing: PatientSummary | null;
  fullName: string;
  birthDate: string;
  sex: "" | "male" | "female";
  phone: string;
  consent: boolean;
  heightCm: string;
  weightKg: string;
  smokingStatus: "" | "never" | "former" | "current";
  cigarettesPerDay: string;
  yearsSmoked: string;
  biomass: YesNo;
  biomassYears: string;
  occupational: YesNo;
  occupationalYears: string;
  cough: YesNo;
  sputum: YesNo;
  dyspnea: YesNo;
  mmrc: string;
  cat: Record<CatItemKey, string>;
}

export function initialState(existing: PatientSummary | null): WizardState {
  return {
    existing,
    fullName: "",
    birthDate: "",
    sex: "",
    phone: "",
    consent: false,
    heightCm: existing?.lastHeightCm ? String(existing.lastHeightCm) : "",
    weightKg: "",
    smokingStatus: "",
    cigarettesPerDay: "",
    yearsSmoked: "",
    biomass: "",
    biomassYears: "",
    occupational: "",
    occupationalYears: "",
    cough: "",
    sputum: "",
    dyspnea: "",
    mmrc: "",
    cat: Object.fromEntries(CAT_ITEM_KEYS.map((k) => [k, ""])) as Record<CatItemKey, string>,
  };
}

const yn = (v: YesNo) => (v === "" ? undefined : v === "yes");
const num = (v: string) => (v.trim() === "" ? null : v);

export function toPayload(s: WizardState): AssessmentPayload {
  return {
    patient: s.existing
      ? { mode: "existing", patientId: s.existing.id }
      : { mode: "new", fullName: s.fullName, birthDate: s.birthDate, sex: s.sex as "male", phone: s.phone, consentResearch: s.consent },
    heightCm: s.heightCm,
    weightKg: num(s.weightKg),
    smoking: {
      status: s.smokingStatus as "never",
      cigarettesPerDay: s.smokingStatus === "never" ? null : num(s.cigarettesPerDay),
      yearsSmoked: s.smokingStatus === "never" ? null : num(s.yearsSmoked),
    },
    biomass: { exposed: yn(s.biomass) as boolean, years: s.biomass === "yes" ? num(s.biomassYears) : null },
    occupational: { exposed: yn(s.occupational) as boolean, years: s.occupational === "yes" ? num(s.occupationalYears) : null },
    symptoms: { chronicCough: yn(s.cough) as boolean, sputum: yn(s.sputum) as boolean, dyspnea: yn(s.dyspnea) as boolean },
    mmrc: (s.mmrc === "" ? undefined : Number(s.mmrc)) as 0,
    catItems: Object.fromEntries(CAT_ITEM_KEYS.map((k) => [k, s.cat[k] === "" ? undefined : Number(s.cat[k])])) as Record<CatItemKey, number>,
  } as AssessmentPayload;
}

export function patientAge(s: WizardState, today: string): number | null {
  const birth = s.existing?.birthDate ?? s.birthDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  return ageOn(birth, today);
}

export function computedPackYears(s: WizardState): number | null {
  if (s.smokingStatus === "never") return 0;
  const cpd = Number(s.cigarettesPerDay.replace(",", "."));
  const yrs = Number(s.yearsSmoked.replace(",", "."));
  if (s.cigarettesPerDay.trim() === "" || s.yearsSmoked.trim() === "") return null;
  return packYears(cpd, yrs);
}

export function catTotal(s: WizardState) {
  return scoreCat(Object.fromEntries(CAT_ITEM_KEYS.map((k) => [k, s.cat[k] === "" ? null : Number(s.cat[k])])));
}

/** Client-side preview with the same pure function the server uses (server recomputes on save). */
export function previewRisk(s: WizardState, ageYears: number): RiskResult {
  const cat = catTotal(s);
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  return computeRisk({
    ageYears,
    smoking: { status: (s.smokingStatus || "never") as "never", packYears: computedPackYears(s) },
    biomass: { exposed: s.biomass === "yes", years: num(s.biomassYears) },
    occupational: { exposed: s.occupational === "yes", years: num(s.occupationalYears) },
    symptoms: { chronicCough: s.cough === "yes", sputum: s.sputum === "yes", dyspnea: s.dyspnea === "yes" },
    mmrc: parseMmrc(s.mmrc),
    catTotal: cat.complete ? cat.total : null,
  });
}
