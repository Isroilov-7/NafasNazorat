/**
 * Anonymised research export (pure function, unit-tested).
 *
 * Contract:
 *  - Only patients with `consentResearch === true`.
 *  - Identifier = random `pseudoId` only. NO name, phone, birth date, internal
 *    UUIDs or user ids (those could be linked back).
 *  - Age at event (years) instead of birth date; event dates reduced to
 *    year-month to lower re-identification risk.
 */
import type { Assessment, Patient, SpirometryRecord } from "./models";

export interface ResearchRow {
  pseudoId: string;
  sex: Patient["sex"];
  event: "assessment" | "spirometry";
  eventMonth: string; // YYYY-MM
  ageYears: number;
  // assessment fields
  packYears: number | null;
  biomassYears: number | null;
  occupationalYears: number | null;
  chronicCough: boolean | null;
  sputum: boolean | null;
  dyspnea: boolean | null;
  mmrc: number | null;
  catTotal: number | null;
  riskScore: number | null;
  riskLevel: string | null;
  riskConfigVersion: string | null;
  // spirometry fields
  heightCm: number | null;
  postFev1L: number | null;
  postFvcL: number | null;
  postRatio: number | null;
  postFev1PctPred: number | null;
  obstruction: string | null;
  goldGrade: number | null;
  method: string | null;
  equationId: string | null;
  referralStatus: Patient["referralStatus"];
}

const EMPTY = {
  packYears: null, biomassYears: null, occupationalYears: null, chronicCough: null, sputum: null, dyspnea: null,
  mmrc: null, catTotal: null, riskScore: null, riskLevel: null, riskConfigVersion: null,
  heightCm: null, postFev1L: null, postFvcL: null, postRatio: null, postFev1PctPred: null, obstruction: null,
  goldGrade: null, method: null, equationId: null,
} as const;

const round = (v: number | null | undefined, d = 3) => (v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d);

export function buildResearchExport(patients: Patient[], assessments: Assessment[], spirometry: SpirometryRecord[]): ResearchRow[] {
  const consented = new Map(patients.filter((p) => p.consentResearch).map((p) => [p.id, p]));
  const rows: ResearchRow[] = [];
  for (const a of assessments) {
    const p = consented.get(a.patientId);
    if (!p) continue;
    rows.push({
      ...EMPTY,
      pseudoId: p.pseudoId,
      sex: p.sex,
      event: "assessment",
      eventMonth: a.assessedAt.slice(0, 7),
      ageYears: a.ageYears,
      packYears: a.answers.smoking.packYears,
      biomassYears: a.answers.biomass.exposed ? a.answers.biomass.years : 0,
      occupationalYears: a.answers.occupational.exposed ? a.answers.occupational.years : 0,
      chronicCough: a.answers.symptoms.chronicCough,
      sputum: a.answers.symptoms.sputum,
      dyspnea: a.answers.symptoms.dyspnea,
      mmrc: a.answers.mmrc,
      catTotal: a.answers.catTotal,
      riskScore: a.risk.score,
      riskLevel: a.risk.level,
      riskConfigVersion: a.risk.configVersion,
      heightCm: a.answers.heightCm,
      referralStatus: p.referralStatus,
    });
  }
  for (const s of spirometry) {
    const p = consented.get(s.patientId);
    if (!p) continue;
    rows.push({
      ...EMPTY,
      pseudoId: p.pseudoId,
      sex: p.sex,
      event: "spirometry",
      eventMonth: s.testedAt.slice(0, 7),
      ageYears: s.ageYears,
      heightCm: s.heightCm,
      postFev1L: s.post?.fev1L ?? null,
      postFvcL: s.post?.fvcL ?? null,
      postRatio: round(s.interpretation.post?.ratio),
      postFev1PctPred: round(s.interpretation.post?.fev1PctPred, 1),
      obstruction: s.interpretation.obstruction,
      goldGrade: s.interpretation.goldGrade,
      method: s.method,
      equationId: s.equationId,
      referralStatus: p.referralStatus,
    });
  }
  return rows.sort((x, y) => x.pseudoId.localeCompare(y.pseudoId) || x.eventMonth.localeCompare(y.eventMonth));
}

export function toCsv(rows: ResearchRow[]): string {
  const cols = Object.keys({ pseudoId: 0, sex: 0, event: 0, eventMonth: 0, ageYears: 0, ...EMPTY, referralStatus: 0 }) as (keyof ResearchRow)[];
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // Prevent CSV/formula injection in spreadsheet tools.
    const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
