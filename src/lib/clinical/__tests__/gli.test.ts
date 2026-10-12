import { describe, expect, it } from "vitest";
import {
  LLN_Z,
  getReferenceEquation,
  isReferenceEquationId,
  lowerLimitOfNormal,
  percentPredicted,
  predictedValues,
  zScore,
} from "..";

/**
 * Expected values computed independently with the reference algorithm of the
 * `rspiro` R package (getLMS / LLN_GLI) on the same GLI-2012 lookup table:
 * see scripts/gen_gli2012.py. Ethnicity: caucasian = 1, other = 5.
 */
const CASES = [
  { age: 40, h: 175, sex: "male", eth: "caucasian", FEV1: [4.077975, 3.231258], FVC: [5.054602, 4.023324], FEV1FVC: [0.809696, 0.704841] },
  { age: 65.3, h: 168, sex: "male", eth: "other", FEV1: [2.784155, 2.045065], FVC: [3.560318, 2.720321], FEV1FVC: [0.781935, 0.663681] },
  { age: 55, h: 160, sex: "female", eth: "caucasian", FEV1: [2.548113, 1.95904], FVC: [3.199877, 2.466971], FEV1FVC: [0.800673, 0.685383] },
  { age: 72.8, h: 155, sex: "female", eth: "other", FEV1: [1.792266, 1.2855], FVC: [2.280139, 1.676184], FEV1FVC: [0.790434, 0.664149] },
  { age: 25, h: 180, sex: "male", eth: "caucasian", FEV1: [4.753829, 3.831672], FVC: [5.700957, 4.611504], FEV1FVC: [0.839971, 0.72504] },
] as const;

describe("GLI-2012 predicted values", () => {
  it.each(CASES)("matches rspiro for $sex $age y, $h cm, $eth", (c) => {
    const p = predictedValues({ ageYears: c.age, heightCm: c.h, sex: c.sex, ethnicity: c.eth });
    expect(p).not.toBeNull();
    for (const idx of ["FEV1", "FVC", "FEV1FVC"] as const) {
      expect(p![idx].predicted).toBeCloseTo(c[idx][0], 5);
      expect(p![idx].lln).toBeCloseTo(c[idx][1], 5);
    }
  });

  it("returns null outside the 3–95 y validity range (never extrapolates)", () => {
    expect(predictedValues({ ageYears: 96, heightCm: 170, sex: "male", ethnicity: "caucasian" })).toBeNull();
    expect(predictedValues({ ageYears: 2.9, heightCm: 90, sex: "male", ethnicity: "caucasian" })).toBeNull();
    expect(predictedValues({ ageYears: Number.NaN, heightCm: 170, sex: "male", ethnicity: "caucasian" })).toBeNull();
    expect(predictedValues({ ageYears: 50, heightCm: 0, sex: "male", ethnicity: "caucasian" })).toBeNull();
  });

  it("works at the exact range edges (age 3 and 95)", () => {
    expect(predictedValues({ ageYears: 3, heightCm: 95, sex: "female", ethnicity: "caucasian" })).not.toBeNull();
    expect(predictedValues({ ageYears: 95, heightCm: 160, sex: "female", ethnicity: "caucasian" })).not.toBeNull();
  });

  it("predicted values are continuous across a spline node", () => {
    const at = (age: number) => predictedValues({ ageYears: age, heightCm: 170, sex: "male", ethnicity: "caucasian" })!.FEV1.predicted;
    expect(Math.abs(at(49.9999) - at(50))).toBeLessThan(1e-4);
  });

  it("exposes a pluggable registry with GLI-2012 as default", () => {
    expect(getReferenceEquation().id).toBe("gli2012");
    expect(isReferenceEquationId("gli2012")).toBe(true);
    expect(isReferenceEquationId("toString")).toBe(false);
    expect(isReferenceEquationId("nhanes3")).toBe(false);
  });
});

describe("LMS helpers", () => {
  const lms = { L: 1.2, M: 4, S: 0.12 };
  it("z = 0 at the median and −1.645 at the LLN", () => {
    expect(zScore(4, lms)).toBeCloseTo(0, 10);
    expect(zScore(lowerLimitOfNormal(lms), lms)).toBeCloseTo(LLN_Z, 10);
  });
  it("handles L = 0 (log-normal) without dividing by zero", () => {
    const l0 = { L: 0, M: 4, S: 0.1 };
    expect(Number.isFinite(lowerLimitOfNormal(l0))).toBe(true);
    expect(zScore(lowerLimitOfNormal(l0), l0)).toBeCloseTo(LLN_Z, 10);
  });
  it("rejects invalid measurements", () => {
    expect(zScore(0, lms)).toBeNull();
    expect(zScore(-1, lms)).toBeNull();
    expect(zScore(Number.NaN, lms)).toBeNull();
  });
  it("percent predicted", () => {
    expect(percentPredicted(2, 4)).toBe(50);
    expect(percentPredicted(2, 0)).toBeNull();
    expect(percentPredicted(-1, 4)).toBeNull();
  });
});
