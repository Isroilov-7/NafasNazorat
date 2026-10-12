import { describe, expect, it } from "vitest";
import { computeRisk, interpretSpirometry } from "@/lib/clinical";
import type { Assessment, Patient, SpirometryRecord } from "../models";
import { buildResearchExport, toCsv } from "../researchExport";

const stamp = { createdBy: "user-1", updatedBy: "user-1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };

const patient = (id: string, consent: boolean, name: string): Patient => ({
  ...stamp, id, pseudoId: `NN-${id}`, fullName: name, birthDate: "1960-04-02", sex: "male",
  phone: "+998901112233", consentResearch: consent, consentAt: consent ? "2026-01-01" : null,
  referralStatus: "recommended", nextReviewDate: "2026-02-01",
});

const answers: Assessment["answers"] = {
  heightCm: 170, weightKg: 80,
  smoking: { status: "current", cigarettesPerDay: 20, yearsSmoked: 30, packYears: 30 },
  biomass: { exposed: false, years: null }, occupational: { exposed: true, years: 12 },
  symptoms: { chronicCough: true, sputum: false, dyspnea: true }, mmrc: 2,
  catItems: {}, catTotal: 14,
};
const risk = computeRisk({ ageYears: 65, smoking: { status: "current", packYears: 30 }, biomass: answers.biomass, occupational: answers.occupational, symptoms: answers.symptoms, mmrc: 2, catTotal: 14 });
const assessment = (patientId: string): Assessment => ({ ...stamp, id: `a-${patientId}`, patientId, assessedAt: "2026-03-17T09:15:00Z", ageYears: 65, answers, risk });
const spiro = (patientId: string): SpirometryRecord => {
  const interpretation = interpretSpirometry({ ageYears: 65, heightCm: 170, sex: "male", post: { fev1L: 1.8, fvcL: 3.5 } }, { method: "fixedRatio" });
  return { ...stamp, id: `s-${patientId}`, patientId, testedAt: "2026-03-20", ageYears: 65, heightCm: 170, sex: "male", ethnicity: "other", equationId: "gli2012", method: "fixedRatio", pre: null, post: { fev1L: 1.8, fvcL: 3.5 }, interpretation };
};

describe("research export", () => {
  const patients = [patient("p1", true, "Rahimov Baxtiyor"), patient("p2", false, "Yusupova Mohira")];
  const rows = buildResearchExport(patients, [assessment("p1"), assessment("p2")], [spiro("p1"), spiro("p2")]);

  it("includes only consented patients", () => {
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.pseudoId))).toEqual(new Set(["NN-p1"]));
  });

  it("contains no PII or linkable internal ids", () => {
    const json = JSON.stringify(rows);
    for (const leak of ["Rahimov", "Yusupova", "+998", "1960-04-02", "user-1", "a-p1", "s-p1", '"p1"']) {
      expect(json).not.toContain(leak);
    }
    for (const key of ["fullName", "phone", "birthDate", "id", "patientId", "createdBy"]) {
      expect(Object.keys(rows[0]!)).not.toContain(key);
    }
  });

  it("coarsens dates to year-month and keeps clinical values", () => {
    const a = rows.find((r) => r.event === "assessment")!;
    expect(a.eventMonth).toBe("2026-03");
    expect(a.packYears).toBe(30);
    expect(a.riskConfigVersion).toBe(risk.configVersion);
    const s = rows.find((r) => r.event === "spirometry")!;
    expect(s.obstruction).toBe("present");
    expect(s.postRatio).toBeCloseTo(0.514, 3);
  });

  it("CSV escapes and neutralises spreadsheet formulas", () => {
    const csv = toCsv([{ ...rows[0]!, pseudoId: "=HYPERLINK(1)" }]);
    expect(csv.split("\n")[1]!.startsWith("'=HYPERLINK(1)")).toBe(true);
    expect(csv.split("\n")[0]).toContain("pseudoId,sex,event,eventMonth,ageYears");
  });
});
