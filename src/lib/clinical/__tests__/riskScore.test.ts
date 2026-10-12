import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_CONFIG, type RiskInput, type RiskScoreConfig, bandPoints, computeRisk, nextReviewDate } from "..";

const base: RiskInput = {
  ageYears: 35,
  smoking: { status: "never", packYears: null },
  biomass: { exposed: false, years: null },
  occupational: { exposed: false, years: null },
  symptoms: { chronicCough: false, sputum: false, dyspnea: false },
  mmrc: 0,
  catTotal: 3,
};

describe("bandPoints", () => {
  const bands = DEFAULT_RISK_CONFIG.factors.packYears;
  it.each([[0, 0], [9.9, 0], [10, 2], [19.9, 2], [20, 3], [40, 4], [120, 4]])("%s pack-years → %s", (v, p) => {
    expect(bandPoints(bands, v)).toBe(p);
  });
});

describe("computeRisk", () => {
  it("young never-smoker without symptoms → low, routine follow-up", () => {
    const r = computeRisk(base);
    expect(r.level).toBe("low");
    expect(r.score).toBe(0);
    expect(r.drivers).toEqual([]);
    expect(r.recommendation).toBe("routineFollowUp");
    expect(r.reviewInMonths).toBe(12);
    expect(r.missing).toEqual([]);
  });

  it("40 pack-years + mMRC 3 → high, with pack-years and mMRC as top drivers", () => {
    const r = computeRisk({
      ...base,
      ageYears: 58,
      smoking: { status: "current", packYears: 40 },
      symptoms: { chronicCough: true, sputum: false, dyspnea: true },
      mmrc: 3,
      catTotal: 18,
    });
    expect(r.level).toBe("high");
    expect(r.scoreLevel).toBe("high");
    expect(r.drivers.slice(0, 2).map((d) => d.factor).sort()).toEqual(["mmrc", "packYears"]);
    expect(r.triggeredRules).toContain("symptomaticWithExposure");
    expect(r.recommendation).toBe("spirometryPriorityPulmonology");
  });

  it("biomass exposure counts like smoking (rural women)", () => {
    const r = computeRisk({
      ...base,
      ageYears: 60,
      biomass: { exposed: true, years: 30 },
      symptoms: { chronicCough: true, sputum: true, dyspnea: true },
      mmrc: 2,
      catTotal: 15,
    });
    expect(r.level).toBe("high");
    expect(r.drivers.map((d) => d.factor)).toContain("biomassYears");
  });

  it("escalation rule raises an asymptomatic heavy smoker to medium", () => {
    const r = computeRisk({ ...base, ageYears: 45, smoking: { status: "former", packYears: 25 } });
    expect(r.scoreLevel).toBe("low");
    expect(r.level).toBe("medium");
    expect(r.triggeredRules).toEqual(["heavyExposureOver40"]);
    expect(r.recommendation).toBe("spirometry");
  });

  it("escalation rules respect the age condition", () => {
    const r = computeRisk({ ...base, ageYears: 39, smoking: { status: "current", packYears: 25 } });
    expect(r.triggeredRules).toEqual([]);
  });

  it("reports missing inputs and scores them as 0 (never invents data)", () => {
    const r = computeRisk({
      ...base,
      ageYears: 50,
      smoking: { status: "current", packYears: null },
      biomass: { exposed: true, years: null },
      mmrc: null,
      catTotal: null,
    });
    expect(r.missing).toEqual(["packYears", "biomassYears", "mmrc", "catTotal"]);
    // biomass with unknown duration scores the minimal band but cannot trigger a duration rule
    expect(r.contributions.find((c) => c.factor === "biomassYears")!.points).toBe(1);
    expect(r.triggeredRules).toEqual([]);
  });

  it("score never exceeds maxScore and every point is attributed", () => {
    const worst = computeRisk({
      ageYears: 80,
      smoking: { status: "current", packYears: 90 },
      biomass: { exposed: true, years: 50 },
      occupational: { exposed: true, years: 50 },
      symptoms: { chronicCough: true, sputum: true, dyspnea: true },
      mmrc: 4,
      catTotal: 40,
    });
    expect(worst.score).toBe(worst.maxScore);
    expect(worst.contributions.reduce((s, c) => s + c.points, 0)).toBe(worst.score);
  });

  it("is driven entirely by config (tunable without code changes)", () => {
    const strict: RiskScoreConfig = {
      ...DEFAULT_RISK_CONFIG,
      version: "test-strict",
      thresholds: { medium: 1, high: 2 },
      escalationRules: [],
    };
    const r = computeRisk({ ...base, ageYears: 52 }, strict); // age 50+ → 2 points
    expect(r.level).toBe("high");
    expect(r.configVersion).toBe("test-strict");
  });

  it("stamps the config version for reproducibility", () => {
    expect(computeRisk(base).configVersion).toBe(DEFAULT_RISK_CONFIG.version);
  });
});

describe("nextReviewDate", () => {
  it("adds calendar months in UTC", () => {
    expect(nextReviewDate(new Date("2026-03-15T10:00:00Z"), 3)).toBe("2026-06-15");
    expect(nextReviewDate(new Date("2026-11-20T00:00:00Z"), 12)).toBe("2027-11-20");
  });
  it("clamps to the end of shorter months", () => {
    expect(nextReviewDate(new Date("2026-01-31T00:00:00Z"), 1)).toBe("2026-02-28");
    expect(nextReviewDate(new Date("2028-01-31T00:00:00Z"), 1)).toBe("2028-02-29");
  });
});
