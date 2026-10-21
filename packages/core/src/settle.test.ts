import { describe, expect, it } from "vitest";
import { computeBalances } from "./balances";
import { demoExpenses, demoSettlements } from "./demo";
import { simplifyDebts } from "./settle";
import type { Balances, Transfer } from "./types";

/** Applies the suggested payments to the balances and returns what is left. */
function applyTransfers(balances: Balances, transfers: Transfer[]): Balances {
  const result = { ...balances };
  for (const t of transfers) {
    result[t.from] = (result[t.from] ?? 0) + t.amount;
    result[t.to] = (result[t.to] ?? 0) - t.amount;
  }
  return result;
}

/** Small seeded random generator (mulberry32) so the "random" tests are repeatable. */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

describe("simplifyDebts", () => {
  it("returns nothing when everyone is settled", () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
    expect(simplifyDebts({})).toEqual([]);
  });

  it("handles one debtor and one creditor", () => {
    expect(simplifyDebts({ a: 500, b: -500 })).toEqual([{ from: "b", to: "a", amount: 500 }]);
  });

  it("collapses a chain A -> B -> C into a single payment", () => {
    // A owes B ₹10, B owes C ₹10  =>  A just pays C.
    const balances = { a: -1000, b: 0, c: 1000 };
    expect(simplifyDebts(balances)).toEqual([{ from: "a", to: "c", amount: 1000 }]);
  });

  it("settles the demo trip", () => {
    const balances = computeBalances(demoExpenses, demoSettlements);
    const transfers = simplifyDebts(balances);
    expect(Object.values(applyTransfers(balances, transfers)).every((v) => v === 0)).toBe(true);
  });

  it("refuses balances that don't add up to 0", () => {
    expect(() => simplifyDebts({ a: 100, b: -50 })).toThrow();
  });

  it("is deterministic", () => {
    const balances = { d: -300, a: 100, c: 100, b: 100 };
    expect(simplifyDebts(balances)).toEqual(simplifyDebts({ ...balances }));
    expect(simplifyDebts(balances)).toEqual([
      { from: "d", to: "a", amount: 100 },
      { from: "d", to: "b", amount: 100 },
      { from: "d", to: "c", amount: 100 },
    ]);
  });

  it("on 1,000 random groups: settles everyone in at most n - 1 positive payments", () => {
    const random = seededRandom(42);

    for (let round = 0; round < 1000; round++) {
      const people = 2 + Math.floor(random() * 10);
      const balances: Balances = {};
      let running = 0;
      for (let i = 0; i < people - 1; i++) {
        const value = Math.floor(random() * 20_001) - 10_000;
        balances[`u${i}`] = value;
        running += value;
      }
      balances[`u${people - 1}`] = -running; // make the total exactly 0

      const transfers = simplifyDebts(balances);
      const nonZero = Object.values(balances).filter((v) => v !== 0).length;

      expect(transfers.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));
      for (const t of transfers) {
        expect(t.amount).toBeGreaterThan(0);
        expect(Number.isInteger(t.amount)).toBe(true);
        expect(t.from).not.toBe(t.to);
      }
      expect(Object.values(applyTransfers(balances, transfers)).every((v) => v === 0)).toBe(true);
    }
  });
});
