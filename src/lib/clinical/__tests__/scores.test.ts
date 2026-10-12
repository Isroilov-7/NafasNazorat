import { describe, expect, it } from "vitest";
import {
  CAT_ITEM_KEYS,
  type CatItemKey,
  catImpact,
  isCatHighSymptom,
  isMmrcGrade,
  isMmrcHighSymptom,
  packYears,
  parseMmrc,
  scoreCat,
} from "..";

const allCat = (score: number) =>
  Object.fromEntries(CAT_ITEM_KEYS.map((k) => [k, score])) as Record<CatItemKey, number>;

describe("packYears", () => {
  it("computes (cigarettes/day ÷ 20) × years", () => {
    expect(packYears(20, 40)).toBe(40);
    expect(packYears(10, 15)).toBe(7.5);
    expect(packYears(30, 10)).toBe(15);
  });
  it("rounds to one decimal", () => {
    expect(packYears(7, 3)).toBe(1.1); // 1.05
  });
  it("handles zero", () => {
    expect(packYears(0, 30)).toBe(0);
    expect(packYears(20, 0)).toBe(0);
  });
  it("rejects negative and non-finite input instead of guessing", () => {
    expect(packYears(-1, 10)).toBeNull();
    expect(packYears(10, -1)).toBeNull();
    expect(packYears(Number.NaN, 10)).toBeNull();
    expect(packYears(10, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("mMRC", () => {
  it("accepts integer grades 0–4 only", () => {
    for (const g of [0, 1, 2, 3, 4]) expect(isMmrcGrade(g)).toBe(true);
    for (const g of [-1, 5, 2.5, Number.NaN, "2", null]) expect(isMmrcGrade(g)).toBe(false);
  });
  it("parses form strings", () => {
    expect(parseMmrc("3")).toBe(3);
    expect(parseMmrc("")).toBeNull();
    expect(parseMmrc("7")).toBeNull();
  });
  it("GOLD high-symptom threshold is ≥ 2", () => {
    expect(isMmrcHighSymptom(1)).toBe(false);
    expect(isMmrcHighSymptom(2)).toBe(true);
  });
});

describe("CAT", () => {
  it("totals 8 items (0–40)", () => {
    expect(scoreCat(allCat(0))).toMatchObject({ complete: true, total: 0, impact: "low" });
    expect(scoreCat(allCat(5))).toMatchObject({ complete: true, total: 40, impact: "veryHigh" });
    expect(scoreCat({ ...allCat(1), cough: 5, sleep: 3 })).toMatchObject({ complete: true, total: 14 });
  });
  it("does not impute missing items", () => {
    const items: Partial<Record<CatItemKey, number>> = allCat(2);
    delete items.phlegm;
    const r = scoreCat(items);
    expect(r.complete).toBe(false);
    expect(r.total).toBeNull();
    expect(r.answered).toBe(7);
    if (!r.complete) expect(r.missing).toEqual(["phlegm"]);
  });
  it("treats out-of-range / non-integer item scores as missing", () => {
    const r = scoreCat({ ...allCat(2), cough: 6, energy: 2.5 });
    expect(r.complete).toBe(false);
    if (!r.complete) expect(r.missing).toEqual(["cough", "energy"]);
  });
  it("impact band boundaries (CAT user guide)", () => {
    expect(catImpact(9)).toBe("low");
    expect(catImpact(10)).toBe("medium");
    expect(catImpact(20)).toBe("medium");
    expect(catImpact(21)).toBe("high");
    expect(catImpact(30)).toBe("high");
    expect(catImpact(31)).toBe("veryHigh");
  });
  it("GOLD high-symptom threshold is ≥ 10", () => {
    expect(isCatHighSymptom(9)).toBe(false);
    expect(isCatHighSymptom(10)).toBe(true);
  });
});
