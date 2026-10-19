import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_CONFIG, type RiskInput, type RiskScoreConfig, computeRisk, describeRiskScale } from "..";

/**
 * The public methodology page (/metodika) and the presentation describe a
 * "19-point scale". These tests pin that description to the real model, so a
 * weight change can never leave a stale explanation on the site.
 */
describe("describeRiskScale", () => {
  const scale = describeRiskScale();

  it("maximum equals computeRisk maxScore — 19 points for the current config", () => {
    const r = computeRisk({
      ageYears: 70,
      smoking: { status: "current", packYears: 50 },
      biomass: { exposed: true, years: 30 },
      occupational: { exposed: true, years: 30 },
      symptoms: { chronicCough: true, sputum: true, dyspnea: true },
      mmrc: 4,
      catTotal: 40,
    });
    expect(scale.maxScore).toBe(r.maxScore);
    expect(r.score).toBe(r.maxScore);
    expect(scale.maxScore).toBe(19);
  });

  it("level ranges come from thresholds: 0–4 low, 5–8 medium, 9–19 high", () => {
    expect(scale.levels.map((l) => [l.level, l.minScore, l.maxScore])).toEqual([
      ["low", 0, 4],
      ["medium", 5, 8],
      ["high", 9, 19],
    ]);
    expect(scale.levels.map((l) => l.reviewInMonths)).toEqual([12, 3, 1]);
  });

  it("factor rows match band semantics (min inclusive, next min exclusive)", () => {
    const pack = scale.factors.find((f) => f.factor === "packYears")!;
    expect(pack.step).toBe(0.1);
    expect(pack.criteria).toEqual([
      { kind: "below", max: 10, points: 0 },
      { kind: "range", min: 10, max: 20, points: 2 },
      { kind: "range", min: 20, max: 40, points: 3 },
      { kind: "atLeast", min: 40, points: 4 },
    ]);
    expect(scale.factors.map((f) => f.factor)).toEqual(computeRisk({
      ageYears: 30, smoking: { status: "never", packYears: null }, biomass: { exposed: false, years: null },
      occupational: { exposed: false, years: null }, symptoms: { chronicCough: false, sputum: false, dyspnea: false },
      mmrc: 0, catTotal: 0,
    }).contributions.map((c) => c.factor));
  });

  it("follows a changed config (no hard-coded 19)", () => {
    const cfg: RiskScoreConfig = {
      ...DEFAULT_RISK_CONFIG,
      factors: { ...DEFAULT_RISK_CONFIG.factors, chronicCough: 2 },
      thresholds: { medium: 6, high: 10 },
    };
    const s = describeRiskScale(cfg);
    expect(s.maxScore).toBe(20);
    expect(s.levels[1]).toMatchObject({ minScore: 6, maxScore: 9 });
  });

  it("the methodology page example: score alone → medium, escalation rule → high", () => {
    // 45-year-old never-smoker, 15 years of tandir/biomass smoke, dyspnoea, mMRC 2, CAT 12
    const example: RiskInput = {
      ageYears: 45,
      smoking: { status: "never", packYears: null },
      biomass: { exposed: true, years: 15 },
      occupational: { exposed: false, years: null },
      symptoms: { chronicCough: false, sputum: false, dyspnea: true },
      mmrc: 2,
      catTotal: 12,
    };
    const r = computeRisk(example);
    expect([r.score, r.scoreLevel, r.level]).toEqual([7, "medium", "high"]);
    expect(r.triggeredRules).toEqual(["symptomaticWithExposure"]);
  });
});
