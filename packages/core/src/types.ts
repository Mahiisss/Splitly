/**
 * Core domain types shared by the web app, the mobile app and the tests.
 *
 * MONEY RULE: every amount in Splitly is an integer number of *minor units*
 * (paise for INR, cents for USD). We never store money as a float, because
 * 0.1 + 0.2 !== 0.3 in JavaScript and those tiny errors add up in balances.
 */

export type UserId = string;

/** An integer amount in minor units, e.g. ₹12.50 is 1250. */
export type Minor = number;

export interface Member {
  id: UserId;
  name: string;
}

/** How much of an expense one person is responsible for. */
export interface Split {
  userId: UserId;
  amount: Minor;
}

/** What an expense was for. Drives the icon shown next to it. */
export const EXPENSE_CATEGORIES = ["stay", "travel", "food", "groceries", "fun", "rent", "bills", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  /** Total amount paid. Must equal the sum of `splits`. */
  amount: Minor;
  /** The person who paid the bill. */
  paidBy: UserId;
  splits: Split[];
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** A real-world payment recorded in the app: `from` paid `to` back. */
export interface Settlement {
  id: string;
  from: UserId;
  to: UserId;
  amount: Minor;
  createdAt: string;
}

/** A suggested payment produced by the settle-up algorithm. */
export interface Transfer {
  from: UserId;
  to: UserId;
  amount: Minor;
}

/**
 * Net position per person.
 * Positive  -> the group owes this person money.
 * Negative  -> this person owes the group money.
 * The values of a valid Balances object always add up to exactly 0.
 */
export type Balances = Record<UserId, Minor>;

/** A group's changing data: what was spent and what was paid back. */
export interface GroupState {
  expenses: Expense[];
  settlements: Settlement[];
}

/** A set of people sharing costs, e.g. "Goa Trip" or "Flat 302". */
export interface Group extends GroupState {
  id: string;
  name: string;
  /** Everyone in the group, in the order they were added (drives avatar colours). */
  members: Member[];
  createdAt: string;
}

/** Everything the app stores on a device. */
export interface AppState {
  groups: Group[];
}
