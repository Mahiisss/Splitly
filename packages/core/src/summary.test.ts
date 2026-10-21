import { describe, expect, it } from "vitest";
import { goaTripExpenses, goaTripMembers, goaTripSettlements, sampleAppState } from "./sample";
import { splitEqually } from "./splits";
import { expenseImpact, settleUpMessage, summarizeGroup, yourBalance } from "./summary";
import type { Expense } from "./types";

describe("summarizeGroup", () => {
  const summary = summarizeGroup(goaTripMembers, goaTripExpenses, goaTripSettlements);

  it("lists every member, most owed first", () => {
    expect(summary.balances).toHaveLength(goaTripMembers.length);
    const values = summary.balances.map((b) => b.balance);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it("totals the group's spending and each person's share", () => {
    const total = goaTripExpenses.reduce((sum, e) => sum + e.amount, 0);
    expect(summary.totalSpent).toBe(total);
    expect(summary.balances.reduce((sum, b) => sum + b.spent, 0)).toBe(total);
  });

  it("merges expenses and payments into one feed, newest first", () => {
    expect(summary.activity).toHaveLength(goaTripExpenses.length + goaTripSettlements.length);
    expect(summary.activity[0]?.kind).toBe("settlement");
    const dates = summary.activity.map((item) => item.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("includes a settle-up plan", () => {
    expect(summary.transfers.length).toBeGreaterThan(0);
  });
});

describe("expenseImpact", () => {
  const dinner: Expense = {
    id: "d",
    description: "Dinner",
    category: "food",
    amount: 1200,
    paidBy: "a",
    splits: splitEqually(1200, ["a", "b", "c"]),
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("shows what the payer lent to everyone else", () => {
    expect(expenseImpact(dinner, "a")).toEqual({ kind: "lent", amount: 800 });
  });

  it("shows what everyone else borrowed", () => {
    expect(expenseImpact(dinner, "b")).toEqual({ kind: "borrowed", amount: 400 });
  });

  it("returns none for someone not in the expense", () => {
    expect(expenseImpact(dinner, "z")).toEqual({ kind: "none" });
  });

  it("returns none when you paid only for yourself", () => {
    const solo = { ...dinner, splits: [{ userId: "a", amount: 1200 }] };
    expect(expenseImpact(solo, "a")).toEqual({ kind: "none" });
  });
});

describe("yourBalance", () => {
  it("matches the group summary", () => {
    for (const group of sampleAppState.groups) {
      const fromSummary = summarizeGroup(group.members, group.expenses, group.settlements).balances.find(
        (b) => b.member.id === "mahi",
      )?.balance;
      expect(yourBalance(group, "mahi")).toBe(fromSummary);
    }
  });
});

describe("settleUpMessage", () => {
  it("lists who pays whom, ready to paste into a chat", () => {
    expect(settleUpMessage(sampleAppState.groups[0]!)).toBe(
      [
        "Goa Trip: settle up",
        "• Aarav pays Mahi ₹3,370.13",
        "• Rohan pays Mahi ₹2,009.74",
        "• Rohan pays Priya ₹1,260.38",
        "Total spent: ₹21,830.50",
      ].join("\n"),
    );
  });

  it("says when nobody owes anything", () => {
    const group = { ...sampleAppState.groups[0]!, expenses: [], settlements: [] };
    expect(settleUpMessage(group)).toContain("Everyone is square.");
  });
});
