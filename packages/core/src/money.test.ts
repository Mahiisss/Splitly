import { describe, expect, it } from "vitest";
import { assertMinor, formatMoney, parseAmount } from "./money";

describe("parseAmount", () => {
  it.each([
    ["99", 9900],
    ["0.5", 50],
    ["0.75", 75],
    ["1,250.50", 125050],
    ["  12.05 ", 1205],
    ["0", 0],
  ])("parses %j as %i paise", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1.234", "1.", ".5", "1e3", "12.3.4"])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("avoids floating-point errors that Math.round(x * 100) would hit", () => {
    // 1.005 * 100 === 100.49999999999999 in JavaScript
    expect(parseAmount("1.01")).toBe(101);
    expect(parseAmount("4.35")).toBe(435);
  });
});

describe("formatMoney", () => {
  it("formats rupees with Indian digit grouping", () => {
    expect(formatMoney(12345678)).toBe("₹1,23,456.78");
  });

  it("supports other currencies", () => {
    expect(formatMoney(1999, "USD", "en-US")).toBe("$19.99");
  });
});

describe("assertMinor", () => {
  it.each([1.5, -1, Number.NaN, Number.MAX_SAFE_INTEGER + 1])("throws for %d", (value) => {
    expect(() => assertMinor(value)).toThrow();
  });
});
