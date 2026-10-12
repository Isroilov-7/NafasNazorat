import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDecimal } from "@/lib/format";

describe("format", () => {
  it("dates as DD.MM.YYYY", () => {
    expect(formatDate("2026-11-02")).toBe("02.11.2026");
    expect(formatDate("2026-11-02T19:30:00.000Z")).toBe("02.11.2026");
    expect(formatDate(null)).toBe("—");
  });
  it("date-times in Tashkent time", () => {
    expect(formatDateTime("2026-11-02T19:30:00.000Z")).toBe("03.11.2026, 00:30");
  });
  it("decimal comma and true minus sign", () => {
    expect(formatDecimal(0.5143)).toBe("0,51");
    expect(formatDecimal(-2.456, 1)).toBe("−2,5");
    expect(formatDecimal(null)).toBe("—");
  });
});
