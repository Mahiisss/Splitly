import { SplitlyError } from "./errors";
import { assertMinor } from "./money";
import type { Balances, Expense, Settlement, UserId } from "./types";

/**
 * Works out each person's net position in a group.
 *
 * - Paying for an expense raises your balance by the full amount.
 * - Your share of an expense lowers it by your share.
 * - Paying someone back (a settlement) raises yours and lowers theirs.
 *
 * Pass `memberIds` to make sure everyone appears, even people at 0.
 */
export function computeBalances(
  expenses: Expense[],
  settlements: Settlement[] = [],
  memberIds: UserId[] = [],
): Balances {
  const balances: Balances = {};
  const add = (userId: UserId, delta: number) => {
    balances[userId] = (balances[userId] ?? 0) + delta;
  };

  for (const id of memberIds) add(id, 0);

  for (const expense of expenses) {
    assertMinor(expense.amount, `Expense "${expense.description}"`);
    const splitTotal = expense.splits.reduce((sum, s) => sum + s.amount, 0);
    if (splitTotal !== expense.amount) {
      throw new SplitlyError(
        `Expense "${expense.description}" splits add up to ${splitTotal}, not ${expense.amount}`,
      );
    }

    add(expense.paidBy, expense.amount);
    for (const split of expense.splits) add(split.userId, -split.amount);
  }

  for (const settlement of settlements) {
    assertMinor(settlement.amount, "Settlement");
    if (settlement.from === settlement.to) {
      throw new SplitlyError("A person can't pay themselves back");
    }
    add(settlement.from, settlement.amount);
    add(settlement.to, -settlement.amount);
  }

  return balances;
}

/** Sum of all balances. Always 0 for data produced by computeBalances. */
export function totalOf(balances: Balances): number {
  return Object.values(balances).reduce((sum, value) => sum + value, 0);
}
