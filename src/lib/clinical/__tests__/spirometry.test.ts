import { describe, expect, it } from "vitest";
import {
  ersAtsSeverity,
  goldGrade,
  interpretSpirometry,
  isBorderlineRatio,
  isObstructedByFixedRatio,
  isSignificantBronchodilatorResponse,
  predictedValues,
} from "..";

describe("GOLD grade (post-BD FEV1 % predicted)", () => {
  it.each([
    [100, 1], [80, 1], [79.99, 2], [50, 2], [49.99, 3], [30, 3], [29.99, 4], [0, 4],
  ] as const)("%s %% → GOLD %s", (pct, grade) => {
    expect(goldGrade(pct)).toBe(grade);
  });
  it("rejects invalid input", () => {
    expect(goldGrade(-5)).toBeNull();
    expect(goldGrade(Number.NaN)).toBeNull();
  });
});

describe("obstruction rules", () => {
  it("fixed ratio is strictly < 0.70", () => {
    expect(isObstructedByFixedRatio(0.699)).toBe(true);
    expect(isObstructedByFixedRatio(0.7)).toBe(false);
  });
  it("borderline window 0.68–0.72", () => {
    expect(isBorderlineRatio(0.679)).toBe(false);
    expect(isBorderlineRatio(0.68)).toBe(true);
    expect(isBorderlineRatio(0.72)).toBe(true);
    expect(isBorderlineRatio(0.721)).toBe(false);
  });
  it("ERS/ATS z-score severity", () => {
    expect(ersAtsSeverity(-1.7)).toBe("mild");
    expect(ersAtsSeverity(-2.5)).toBe("moderate");
    expect(ersAtsSeverity(-4)).toBe("moderate");
    expect(ersAtsSeverity(-4.01)).toBe("severe");
  });
  it("bronchodilator response > 10 % of predicted", () => {
    expect(isSignificantBronchodilatorResponse(2.0, 2.41, 4)).toBe(true); // 10.25 %
    expect(isSignificantBronchodilatorResponse(2.0, 2.4, 4)).toBe(false); // exactly 10 %
    expect(isSignificantBronchodilatorResponse(2.0, 2.5, 0)).toBe(false);
  });
});

const demo = { ageYears: 62, heightCm: 172, sex: "male", ethnicity: "caucasian" } as const;

describe("interpretSpirometry", () => {
  it("confirms obstruction on post-BD values and assigns a GOLD grade", () => {
    const r = interpretSpirometry(
      { ...demo, pre: { fev1L: 1.7, fvcL: 3.4 }, post: { fev1L: 1.8, fvcL: 3.5 } },
      { method: "fixedRatio" },
    );
    const pred = predictedValues(demo)!;
    expect(r.basis).toBe("post");
    expect(r.obstruction).toBe("present");
    expect(r.confirmedPostBd).toBe(true);
    expect(r.post!.ratio).toBeCloseTo(1.8 / 3.5, 10);
    expect(r.post!.fev1PctPred).toBeCloseTo((1.8 / pred.FEV1.predicted) * 100, 10);
    expect(r.goldGrade).toBe(2); // ≈ 55 %
    expect(r.flags).not.toContain("postBronchodilatorMissing");
    expect(r.ersAtsSeverity).not.toBeNull();
  });

  it("pre-BD only: provisional, no GOLD grade, flagged — never guesses", () => {
    const r = interpretSpirometry({ ...demo, pre: { fev1L: 1.7, fvcL: 3.4 } }, { method: "fixedRatio" });
    expect(r.basis).toBe("pre");
    expect(r.obstruction).toBe("present");
    expect(r.confirmedPostBd).toBe(false);
    expect(r.goldGrade).toBeNull();
    expect(r.flags).toContain("postBronchodilatorMissing");
  });

  it("fixed ratio still works without demographics, but no % predicted", () => {
    const r = interpretSpirometry({ post: { fev1L: 1.5, fvcL: 3.0 } }, { method: "fixedRatio" });
    expect(r.obstruction).toBe("present");
    expect(r.flags).toContain("demographicsMissing");
    expect(r.post!.fev1PctPred).toBeNull();
    expect(r.goldGrade).toBeNull();
  });

  it("LLN method without demographics is indeterminate (no silent fallback)", () => {
    const r = interpretSpirometry({ post: { fev1L: 1.5, fvcL: 3.0 } }, { method: "lln" });
    expect(r.obstruction).toBe("indeterminate");
    expect(r.flags).toEqual(expect.arrayContaining(["demographicsMissing", "llnUnavailable"]));
    expect(r.confirmedPostBd).toBe(false);
  });

  it("flags disagreement between fixed ratio and LLN (elderly over-diagnosis)", () => {
    // 82-year-old: fixed ratio says obstructed (≈0.686) while LLN (~0.62) does not.
    const elderly = { ageYears: 82, heightCm: 165, sex: "male", ethnicity: "caucasian" } as const;
    const pred = predictedValues(elderly)!;
    expect(pred.FEV1FVC.lln).toBeLessThan(0.68);
    const input = { ...elderly, post: { fev1L: 1.75, fvcL: 2.55 } };
    const fixed = interpretSpirometry(input, { method: "fixedRatio" });
    const lln = interpretSpirometry(input, { method: "lln" });
    expect(fixed.obstruction).toBe("present");
    expect(lln.obstruction).toBe("absent");
    expect(fixed.alternateMethodObstructed).toBe(false);
    expect(fixed.flags).toEqual(expect.arrayContaining(["methodsDisagree", "borderlineRatio"]));
  });

  it("rejects FEV1 > FVC and implausible volumes", () => {
    const r = interpretSpirometry(
      { ...demo, pre: { fev1L: 3.6, fvcL: 3.4 }, post: { fev1L: 0, fvcL: 12 } },
      { method: "fixedRatio" },
    );
    expect(r.obstruction).toBe("indeterminate");
    expect(r.flags).toEqual(
      expect.arrayContaining(["fev1ExceedsFvcPre", "implausibleVolumePost", "noValidMeasurements"]),
    );
  });

  it("detects PRISm (ratio ≥ 0.70 with FEV1 < 80 %)", () => {
    const r = interpretSpirometry({ ...demo, post: { fev1L: 2.2, fvcL: 2.9 } }, { method: "fixedRatio" });
    expect(r.obstruction).toBe("absent");
    expect(r.flags).toContain("prism");
    expect(r.goldGrade).toBeNull();
  });

  it("detects a significant bronchodilator response", () => {
    const r = interpretSpirometry(
      { ...demo, pre: { fev1L: 1.6, fvcL: 3.2 }, post: { fev1L: 2.1, fvcL: 3.4 } },
      { method: "fixedRatio" },
    );
    expect(r.flags).toContain("significantBronchodilatorResponse");
  });

  it("outside reference range: classification by ratio only, flagged", () => {
    const r = interpretSpirometry(
      { ageYears: 97, heightCm: 160, sex: "female", post: { fev1L: 1.0, fvcL: 1.6 } },
      { method: "fixedRatio" },
    );
    expect(r.predicted).toBeNull();
    expect(r.flags).toContain("outsideReferenceRange");
    expect(r.obstruction).toBe("present");
    expect(r.goldGrade).toBeNull();
  });

  it("records the reference equation used", () => {
    const r = interpretSpirometry({ ...demo, post: { fev1L: 3, fvcL: 4 } }, { method: "lln" });
    expect(r.equationId).toBe("gli2012");
    expect(r.method).toBe("lln");
  });
});
