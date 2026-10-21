import { totalOf } from "./balances";
import { SplitlyError } from "./errors";
import type { Balances, Transfer, UserId } from "./types";

interface Position {
  userId: UserId;
  amount: number; // always positive here: how much is owed / owing
}

const byAmountThenId = (a: Position, b: Position) => b.amount - a.amount || a.userId.localeCompare(b.userId);

/**
 * "Settle up": turns everyone's balance into a short list of payments that
 * brings every balance back to 0.
 *
 * How it works (greedy, O(n log n)):
 * 1. Split people into creditors (owed money) and debtors (owe money).
 * 2. Sort both lists from biggest to smallest.
 * 3. Match the current debtor with the current creditor and pay the smaller
 *    of the two amounts. Whoever reaches 0 is done; move to the next one.
 *
 * Every step clears at least one person, so the result has at most n - 1
 * payments for n people with a non-zero balance. That is usually optimal,
 * but not always: finding the true minimum is NP-hard (see README, challenge #1).
 *
 * The output is deterministic: the same balances always give the same plan.
 */
export function simplifyDebts(balances: Balances): Transfer[] {
  if (totalOf(balances) !== 0) {
    throw new SplitlyError("Balances don't add up to 0, so they can't be settled");
  }

  const creditors: Position[] = [];
  const debtors: Position[] = [];
  for (const [userId, amount] of Object.entries(balances)) {
    if (amount > 0) creditors.push({ userId, amount });
    if (amount < 0) debtors.push({ userId, amount: -amount });
  }
  creditors.sort(byAmountThenId);
  debtors.sort(byAmountThenId);

  const transfers: Transfer[] = [];
  let c = 0;
  let d = 0;

  while (c < creditors.length && d < debtors.length) {
    const creditor = creditors[c]!;
    const debtor = debtors[d]!;
    const amount = Math.min(creditor.amount, debtor.amount);

    transfers.push({ from: debtor.userId, to: creditor.userId, amount });
    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) c++;
    if (debtor.amount === 0) d++;
  }

  return transfers;
}
