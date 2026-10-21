import { computeBalances } from "./balances";
import { simplifyDebts } from "./settle";
import { formatMoney } from "./money";
import type { Expense, Group, Member, Minor, Settlement, Transfer, UserId } from "./types";

export interface MemberBalance {
  member: Member;
  /** Positive: is owed money. Negative: owes money. */
  balance: Minor;
  /** Total of this person's shares across all expenses. */
  spent: Minor;
}

/** One entry in a group's history: an expense or a recorded payment. */
export type ActivityItem =
  | { kind: "expense"; id: string; createdAt: string; expense: Expense }
  | { kind: "settlement"; id: string; createdAt: string; settlement: Settlement };

export interface GroupSummary {
  /** Everyone, sorted from most owed to most owing. */
  balances: MemberBalance[];
  /** The fewest-payments plan to settle everything (see simplifyDebts). */
  transfers: Transfer[];
  /** Total of all expenses in the group. */
  totalSpent: Minor;
  /** Expenses and payments together, newest first. */
  activity: ActivityItem[];
}

/**
 * Everything a group screen needs, computed in one place so the web and
 * mobile apps show exactly the same numbers.
 */
export function summarizeGroup(members: Member[], expenses: Expense[], settlements: Settlement[] = []): GroupSummary {
  const balances = computeBalances(expenses, settlements, members.map((m) => m.id));

  const spent: Record<string, Minor> = {};
  for (const expense of expenses) {
    for (const split of expense.splits) {
      spent[split.userId] = (spent[split.userId] ?? 0) + split.amount;
    }
  }

  const activity: ActivityItem[] = [
    ...expenses.map((expense) => ({ kind: "expense" as const, id: expense.id, createdAt: expense.createdAt, expense })),
    ...settlements.map((settlement) => ({
      kind: "settlement" as const,
      id: settlement.id,
      createdAt: settlement.createdAt,
      settlement,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    balances: members
      .map((member) => ({ member, balance: balances[member.id] ?? 0, spent: spent[member.id] ?? 0 }))
      .sort((a, b) => b.balance - a.balance || a.member.name.localeCompare(b.member.name)),
    transfers: simplifyDebts(balances),
    totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
    activity,
  };
}

export type ExpenseImpact =
  | { kind: "lent"; amount: Minor } // you paid, others owe you this much of it
  | { kind: "borrowed"; amount: Minor } // someone else paid your share
  | { kind: "none" }; // you paid only for yourself, or weren't part of it

/**
 * How one expense affects one person, the way Splitwise shows it:
 * "you lent ₹900" or "you borrowed ₹300".
 */
export function expenseImpact(expense: Expense, userId: UserId): ExpenseImpact {
  const share = expense.splits.find((s) => s.userId === userId)?.amount ?? 0;
  const net = (expense.paidBy === userId ? expense.amount : 0) - share;

  if (net > 0) return { kind: "lent", amount: net };
  if (net < 0) return { kind: "borrowed", amount: -net };
  return { kind: "none" };
}

/** Your net position in one group: positive means you get money back. */
export function yourBalance(group: Group, userId: UserId): Minor {
  return computeBalances(group.expenses, group.settlements)[userId] ?? 0;
}

/**
 * A plain-text settle-up summary to paste into the group's WhatsApp chat:
 *
 *   Goa Trip: settle up
 *   • Aarav pays Mahi ₹3,370.13
 *   • Rohan pays Mahi ₹2,009.74
 *   Total spent: ₹21,830.50
 */
export function settleUpMessage(group: Group): string {
  const summary = summarizeGroup(group.members, group.expenses, group.settlements);
  const name = (id: UserId) => group.members.find((m) => m.id === id)?.name ?? id;
  const lines =
    summary.transfers.length === 0
      ? ["Everyone is square. Nothing to pay."]
      : summary.transfers.map((t) => `• ${name(t.from)} pays ${name(t.to)} ${formatMoney(t.amount)}`);
  return [`${group.name}: settle up`, ...lines, `Total spent: ${formatMoney(summary.totalSpent)}`].join("\n");
}
