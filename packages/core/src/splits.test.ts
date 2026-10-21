import { describe, expect, it } from "vitest";
import { splitByShares, splitEqually, splitExact } from "./splits";
import type { Split } from "./types";

const sum = (splits: Split[]) => splits.reduce((total, s) => total + s.amount, 0);

describe("splitEqually", () => {
  it("splits evenly when it can", () => {
    expect(splitEqually(900, ["a", "b", "c"])).toEqual([
      { userId: "a", amount: 300 },
      { userId: "b", amount: 300 },
      { userId: "c", amount: 300 },
    ]);
  });

  it("gives leftover paise to the first people so the total is exact", () => {
    const result = splitEqually(1000, ["a", "b", "c"]);
    expect(result.map((s) => s.amount)).toEqual([334, 333, 333]);
    expect(sum(result)).toBe(1000);
  });

  it("always adds up to the total", () => {
    for (let amount = 0; amount < 500; amount++) {
      for (let people = 1; people <= 7; people++) {
        const ids = Array.from({ length: people }, (_, i) => `u${i}`);
        expect(sum(splitEqually(amount, ids))).toBe(amount);
      }
    }
  });

  it("rejects empty or duplicate member lists", () => {
    expect(() => splitEqually(100, [])).toThrow();
    expect(() => splitEqually(100, ["a", "a"])).toThrow();
  });
});

describe("splitByShares", () => {
  it("splits in proportion to shares", () => {
    const result = splitByShares(600, [
      { userId: "a", shares: 2 },
      { userId: "b", shares: 1 },
    ]);
    expect(result).toEqual([
      { userId: "a", amount: 400 },
      { userId: "b", amount: 200 },
    ]);
  });

  it("works as a percentage split", () => {
    const result = splitByShares(10_000, [
      { userId: "a", shares: 50 },
      { userId: "b", shares: 30 },
      { userId: "c", shares: 20 },
    ]);
    expect(result.map((s) => s.amount)).toEqual([5000, 3000, 2000]);
  });

  it("uses largest remainder for rounding and keeps the total exact", () => {
    // 100 * 1/3 = 33.33..., 100 * 2/3 = 66.66... -> the larger cut-off gets the extra paisa
    const result = splitByShares(100, [
      { userId: "a", shares: 1 },
      { userId: "b", shares: 2 },
    ]);
    expect(result.map((s) => s.amount)).toEqual([33, 67]);
    expect(sum(result)).toBe(100);
  });

  it("lets someone have 0 shares", () => {
    const result = splitByShares(500, [
      { userId: "a", shares: 1 },
      { userId: "b", shares: 0 },
    ]);
    expect(result.map((s) => s.amount)).toEqual([500, 0]);
  });

  it("rejects bad shares", () => {
    expect(() => splitByShares(100, [{ userId: "a", shares: 0 }])).toThrow();
    expect(() => splitByShares(100, [{ userId: "a", shares: 1.5 }])).toThrow();
    expect(() => splitByShares(100, [{ userId: "a", shares: -1 }])).toThrow();
  });
});

describe("splitExact", () => {
  it("accepts splits that add up", () => {
    const splits = [
      { userId: "a", amount: 70 },
      { userId: "b", amount: 30 },
    ];
    expect(splitExact(100, splits)).toEqual(splits);
  });

  it("rejects splits that don't add up", () => {
    expect(() =>
      splitExact(100, [
        { userId: "a", amount: 70 },
        { userId: "b", amount: 20 },
      ]),
    ).toThrow(/add up to 90/);
  });
});
