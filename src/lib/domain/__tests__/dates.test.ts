import { describe, expect, it } from "vitest";
import { ageOn, isIsoDate, reviewState, todayInClinic } from "../dates";

describe("dates", () => {
  it("computes completed years of age", () => {
    expect(ageOn("1960-05-20", "2026-05-19")).toBe(65);
    expect(ageOn("1960-05-20", "2026-05-20")).toBe(66);
    expect(ageOn("2000-02-29", "2026-02-28")).toBe(25);
  });
  it("validates calendar dates", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("29.02.2028")).toBe(false);
  });
  it("uses Tashkent time (UTC+5) for 'today'", () => {
    expect(todayInClinic(new Date("2026-10-12T20:30:00Z"))).toBe("2026-10-13");
    expect(todayInClinic(new Date("2026-10-12T18:30:00Z"))).toBe("2026-10-12");
  });
  it("classifies review reminders", () => {
    expect(reviewState(null, "2026-10-12")).toBe("none");
    expect(reviewState("2026-10-11", "2026-10-12")).toBe("overdue");
    expect(reviewState("2026-10-12", "2026-10-12")).toBe("dueSoon");
    expect(reviewState("2026-10-26", "2026-10-12")).toBe("dueSoon");
    expect(reviewState("2026-10-27", "2026-10-12")).toBe("scheduled");
  });
});
