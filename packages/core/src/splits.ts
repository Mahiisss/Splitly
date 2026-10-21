import { SplitlyError } from "./errors";
import { assertMinor } from "./money";
import type { Minor, Split, UserId } from "./types";

function assertUniqueUsers(userIds: UserId[]): void {
  if (userIds.length === 0) {
    throw new SplitlyError("A split needs at least one person");
  }
  if (new Set(userIds).size !== userIds.length) {
    throw new SplitlyError("The same person appears twice in a split");
  }
}

/**
 * Splits `amount` equally. Paise that can't be divided evenly go to the first
 * people in the list, one each, so the parts always add up to the exact total.
 *
 * splitEqually(1000, ["a", "b", "c"]) -> a: 334, b: 333, c: 333
 */
export function splitEqually(amount: Minor, userIds: UserId[]): Split[] {
  assertMinor(amount);
  assertUniqueUsers(userIds);

  const base = Math.floor(amount / userIds.length);
  const remainder = amount - base * userIds.length;

  return userIds.map((userId, index) => ({
    userId,
    amount: base + (index < remainder ? 1 : 0),
  }));
}

/**
 * Splits `amount` in proportion to each person's shares (also used for
 * percentages: shares of 50/30/20). Uses the "largest remainder" method so
 * the rounded parts still add up to the exact total.
 */
export function splitByShares(amount: Minor, shares: { userId: UserId; shares: number }[]): Split[] {
  assertMinor(amount);
  assertUniqueUsers(shares.map((s) => s.userId));

  for (const s of shares) {
    if (!Number.isSafeInteger(s.shares) || s.shares < 0) {
      throw new SplitlyError(`Shares must be whole, non-negative numbers (got ${s.shares})`);
    }
  }
  const totalShares = shares.reduce((sum, s) => sum + s.shares, 0);
  if (totalShares === 0) {
    throw new SplitlyError("At least one person needs more than 0 shares");
  }

  // Exact share = amount * shares / totalShares. Take the floor, remember what was cut off.
  const parts = shares.map((s, index) => {
    const numerator = amount * s.shares;
    return {
      index,
      userId: s.userId,
      amount: Math.floor(numerator / totalShares),
      cutOff: numerator % totalShares,
    };
  });

  // Hand the leftover paise to whoever lost the most to rounding (ties: list order).
  let leftover = amount - parts.reduce((sum, p) => sum + p.amount, 0);
  const byLargestCutOff = [...parts].sort((a, b) => b.cutOff - a.cutOff || a.index - b.index);
  for (const part of byLargestCutOff) {
    if (leftover === 0) break;
    part.amount += 1;
    leftover -= 1;
  }

  return parts.map(({ userId, amount: partAmount }) => ({ userId, amount: partAmount }));
}

/**
 * Validates splits where the user typed every person's amount by hand.
 * Throws if the parts don't add up to the total.
 */
export function splitExact(amount: Minor, splits: Split[]): Split[] {
  assertMinor(amount);
  assertUniqueUsers(splits.map((s) => s.userId));
  splits.forEach((s) => assertMinor(s.amount, `Amount for ${s.userId}`));

  const sum = splits.reduce((total, s) => total + s.amount, 0);
  if (sum !== amount) {
    throw new SplitlyError(`Split amounts add up to ${sum}, but the expense total is ${amount}`);
  }
  return splits.map((s) => ({ ...s }));
}
