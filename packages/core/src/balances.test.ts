import { describe, expect, it } from "vitest";
import { computeBalances, totalOf } from "./balances";
import { demoExpenses, demoMembers, demoSettlements } from "./demo";
import { splitEqually } from "./splits";
import type { Expense } from "./types";

const expense = (overrides: Partial<Expense> & Pick<Expense, "amount" | "paidBy" | "splits">): Expense => ({
  id: "x",
  description: "Test",
  category: "other",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("computeBalances", () => {
  it("credits the payer and debits each share", () => {
    const balances = computeBalances([
      expense({ amount: 300, paidBy: "a", splits: splitEqually(300, ["a", "b", "c"]) }),
    ]);
    expect(balances).toEqual({ a: 200, b: -100, c: -100 });
  });

  it("applies settlements", () => {
    const balances = computeBalances(
      [expense({ amount: 300, paidBy: "a", splits: splitEqually(300, ["a", "b", "c"]) })],
      [{ id: "s", from: "b", to: "a", amount: 100, createdAt: "2026-01-02T00:00:00.000Z" }],
    );
    expect(balances).toEqual({ a: 100, b: 0, c: -100 });
  });

  it("includes members with no activity when memberIds is given", () => {
    expect(computeBalances([], [], ["a", "b"])).toEqual({ a: 0, b: 0 });
  });

  it("always adds up to 0", () => {
    const balances = computeBalances(demoExpenses, demoSettlements, demoMembers.map((m) => m.id));
    expect(totalOf(balances)).toBe(0);
  });

  it("rejects an expense whose splits don't match its total", () => {
    expect(() =>
      computeBalances([expense({ amount: 300, paidBy: "a", splits: [{ userId: "b", amount: 200 }] })]),
    ).toThrow(/add up to 200/);
  });

  it("rejects paying yourself", () => {
    expect(() =>
      computeBalances([], [{ id: "s", from: "a", to: "a", amount: 10, createdAt: "2026-01-01T00:00:00.000Z" }]),
    ).toThrow();
  });
});
