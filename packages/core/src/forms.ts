import { SplitlyError } from "./errors";
import { formatMoney, parseAmount } from "./money";
import { splitByShares, splitEqually, splitExact } from "./splits";
import type { Expense, ExpenseCategory, Group, Member, Minor, Settlement, Split, UserId } from "./types";

/**
 * Form logic for "Add expense" and "Record a payment", shared by web and
 * mobile. The forms keep what the user typed as strings; these functions
 * turn that into validated Expense / Settlement objects, or explain what's wrong.
 */

export type SplitMethod = "equal" | "shares" | "exact";

export interface ExpenseDraft {
  description: string;
  /** The total, exactly as typed, e.g. "1,250.50". */
  amount: string;
  paidBy: UserId;
  category: ExpenseCategory;
  method: SplitMethod;
  /** Equal split: who is included. */
  included: UserId[];
  /** Shares or exact split: what was typed next to each person ("" counts as 0). */
  values: Record<UserId, string>;
}

export interface ExpenseErrors {
  description?: string;
  amount?: string;
  split?: string;
}

export interface ExpensePreview {
  /** The parsed total, or null while it isn't a valid amount yet. */
  amount: Minor | null;
  /** Each person's share, or null while the split can't be worked out yet. */
  splits: Split[] | null;
  /** Exact split only: total minus what has been assigned so far (negative = too much). */
  remaining: Minor | null;
  errors: ExpenseErrors;
}

const MAX_DESCRIPTION = 100;

/** Works out the split live while the user types, plus any problems to show. */
export function previewExpense(draft: ExpenseDraft, memberIds: UserId[]): ExpensePreview {
  const errors: ExpenseErrors = {};
  const description = draft.description.trim();
  if (description.length === 0) errors.description = "Add a short description, like “Dinner”.";
  else if (description.length > MAX_DESCRIPTION) errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;

  const parsed = parseAmount(draft.amount);
  const amount = parsed !== null && parsed > 0 ? parsed : null;
  if (amount === null) errors.amount = "Enter an amount greater than 0, with up to 2 decimals.";

  let splits: Split[] | null = null;
  let remaining: Minor | null = null;

  if (draft.method === "equal") {
    const included = memberIds.filter((id) => draft.included.includes(id));
    if (included.length === 0) errors.split = "Pick at least one person to split with.";
    else if (amount !== null) splits = splitEqually(amount, included);
  }

  if (draft.method === "shares") {
    const shares = memberIds.map((userId) => ({ userId, text: (draft.values[userId] ?? "").trim() }));
    const invalid = shares.find((s) => s.text !== "" && !/^\d+$/.test(s.text));
    const parsedShares = shares.map((s) => ({ userId: s.userId, shares: s.text === "" ? 0 : Number(s.text) }));
    if (invalid) errors.split = "Shares must be whole numbers, like 1 or 2.";
    else if (parsedShares.every((s) => s.shares === 0)) errors.split = "Give at least one person 1 or more shares.";
    else if (amount !== null) splits = splitByShares(amount, parsedShares).filter((s) => s.amount > 0);
  }

  if (draft.method === "exact") {
    const typed = memberIds.map((userId) => ({ userId, text: (draft.values[userId] ?? "").trim() }));
    const parsedAmounts = typed.map((t) => ({ userId: t.userId, amount: t.text === "" ? 0 : parseAmount(t.text) }));
    if (parsedAmounts.some((p) => p.amount === null)) {
      errors.split = "Each amount needs to be a number with up to 2 decimals.";
    } else {
      const valid = parsedAmounts as Split[];
      const assigned = valid.reduce((sum, s) => sum + s.amount, 0);
      if (amount !== null) {
        remaining = amount - assigned;
        if (remaining > 0) errors.split = `${formatMoney(remaining)} still to assign.`;
        else if (remaining < 0) errors.split = `That's ${formatMoney(-remaining)} more than the total.`;
        else splits = splitExact(amount, valid.filter((s) => s.amount > 0));
      }
    }
  }

  if (!memberIds.includes(draft.paidBy)) errors.split ??= "Choose who paid.";

  return { amount, splits, remaining, errors };
}

export type BuildResult<T, E> = { ok: true; value: T } | { ok: false; errors: E };

/** Turns a finished draft into an Expense, or returns the problems to show. */
export function buildExpense(
  draft: ExpenseDraft,
  memberIds: UserId[],
  meta: { id: string; createdAt: string },
): BuildResult<Expense, ExpenseErrors> {
  const preview = previewExpense(draft, memberIds);
  if (Object.keys(preview.errors).length > 0 || preview.amount === null || preview.splits === null) {
    return { ok: false, errors: preview.errors };
  }
  return {
    ok: true,
    value: {
      id: meta.id,
      description: draft.description.trim(),
      category: draft.category,
      amount: preview.amount,
      paidBy: draft.paidBy,
      splits: preview.splits,
      createdAt: meta.createdAt,
    },
  };
}

export interface PaymentDraft {
  from: UserId;
  to: UserId;
  amount: string;
}

export interface PaymentErrors {
  people?: string;
  amount?: string;
}

/** Turns a "Record a payment" form into a Settlement, or returns the problems to show. */
export function buildSettlement(
  draft: PaymentDraft,
  memberIds: UserId[],
  meta: { id: string; createdAt: string },
): BuildResult<Settlement, PaymentErrors> {
  const errors: PaymentErrors = {};
  if (!memberIds.includes(draft.from) || !memberIds.includes(draft.to)) errors.people = "Choose who paid and who received it.";
  else if (draft.from === draft.to) errors.people = "Pick two different people.";

  const amount = parseAmount(draft.amount);
  if (amount === null || amount === 0) errors.amount = "Enter an amount greater than 0, with up to 2 decimals.";

  if (Object.keys(errors).length > 0 || amount === null) return { ok: false, errors };
  return { ok: true, value: { id: meta.id, from: draft.from, to: draft.to, amount, createdAt: meta.createdAt } };
}

/** Amount in minor units -> what to pre-fill in a text field, e.g. 126038 -> "1260.38". */
export function amountToInput(amount: Minor): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new SplitlyError(`Invalid amount ${amount}`);
  const rupees = Math.floor(amount / 100);
  const paise = amount % 100;
  return paise === 0 ? String(rupees) : `${rupees}.${String(paise).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Editing an expense
// ---------------------------------------------------------------------------

/**
 * Turns a saved expense back into form values, so "Edit" opens a filled-in form.
 * An expense that was split equally between some people opens as "Equally";
 * anything else opens as "Exact amounts" with each person's share filled in.
 * (Shares aren't stored, only the amounts they produced.)
 */
export function draftFromExpense(expense: Expense, memberIds: UserId[]): ExpenseDraft {
  const base = {
    description: expense.description,
    amount: amountToInput(expense.amount),
    paidBy: expense.paidBy,
    category: expense.category,
  };
  const included = memberIds.filter((id) => expense.splits.some((s) => s.userId === id && s.amount > 0));
  const equal = included.length > 0 ? splitEqually(expense.amount, included) : [];
  const isEqual =
    equal.length === expense.splits.filter((s) => s.amount > 0).length &&
    equal.every((e) => expense.splits.find((s) => s.userId === e.userId)?.amount === e.amount);

  if (isEqual) return { ...base, method: "equal", included, values: {} };
  return {
    ...base,
    method: "exact",
    included: memberIds,
    values: Object.fromEntries(expense.splits.filter((s) => s.amount > 0).map((s) => [s.userId, amountToInput(s.amount)])),
  };
}

// ---------------------------------------------------------------------------
// Creating a group
// ---------------------------------------------------------------------------

export interface GroupDraft {
  name: string;
  /** Names of the other people, as typed. Empty rows are ignored. */
  memberNames: string[];
}

export interface GroupErrors {
  name?: string;
  members?: string;
}

const MAX_GROUP_NAME = 60;
const MAX_MEMBER_NAME = 30;

/**
 * Turns the "New group" form into a Group, with you as the first member.
 * `newId` makes ids for the new members (crypto.randomUUID on web,
 * expo-crypto on mobile).
 */
export function buildGroup(
  draft: GroupDraft,
  you: Member,
  meta: { id: string; createdAt: string; newId: () => string },
): BuildResult<Group, GroupErrors> {
  const errors: GroupErrors = {};
  const name = draft.name.trim();
  if (name.length === 0) errors.name = "Give the group a name, like “Flat 302” or “Manali trip”.";
  else if (name.length > MAX_GROUP_NAME) errors.name = `Keep it under ${MAX_GROUP_NAME} characters.`;

  const others = draft.memberNames.map((n) => n.trim()).filter(Boolean);
  const lower = others.map((n) => n.toLowerCase());
  if (others.length === 0) errors.members = "Add at least one other person to split with.";
  else if (others.some((n) => n.length > MAX_MEMBER_NAME)) errors.members = `Names can be up to ${MAX_MEMBER_NAME} characters.`;
  else if (lower.includes(you.name.toLowerCase()) || lower.includes("you"))
    errors.members = "You're already in the group, so leave yourself out.";
  else if (new Set(lower).size !== lower.length) errors.members = "Two people have the same name. Add a surname or initial.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      id: meta.id,
      name,
      createdAt: meta.createdAt,
      members: [you, ...others.map((n) => ({ id: meta.newId(), name: n }))],
      expenses: [],
      settlements: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Editing a group
// ---------------------------------------------------------------------------

/** True if this person paid, shared in, or was part of a payment in the group. */
export function memberInUse(group: Group, userId: UserId): boolean {
  return (
    group.expenses.some((e) => e.paidBy === userId || e.splits.some((s) => s.userId === userId)) ||
    group.settlements.some((s) => s.from === userId || s.to === userId)
  );
}

export interface GroupEditDraft {
  name: string;
  /** Ids of the current members to keep, in any order. */
  keep: UserId[];
  /** Names of people to add, as typed. Empty rows are ignored. */
  newNames: string[];
}

export interface GroupEditErrors {
  name?: string;
  members?: string;
}

/**
 * Validates the "Edit group" form. You can rename the group, add people, and
 * remove people who aren't part of any expense or payment yet (removing them
 * later would make the balances wrong). You always stay in the group.
 */
export function buildGroupEdit(
  group: Group,
  draft: GroupEditDraft,
  youId: UserId,
  newId: () => string,
): BuildResult<{ name: string; members: Member[] }, GroupEditErrors> {
  const errors: GroupEditErrors = {};
  const name = draft.name.trim();
  if (name.length === 0) errors.name = "Give the group a name.";
  else if (name.length > MAX_GROUP_NAME) errors.name = `Keep it under ${MAX_GROUP_NAME} characters.`;

  const kept = group.members.filter((m) => m.id === youId || draft.keep.includes(m.id));
  const removed = group.members.filter((m) => !kept.includes(m));
  const blocked = removed.filter((m) => memberInUse(group, m.id));
  const added = draft.newNames.map((n) => n.trim()).filter(Boolean);
  const allNames = [...kept.map((m) => m.name), ...added].map((n) => n.toLowerCase());

  if (blocked.length > 0) {
    errors.members = `${blocked.map((m) => m.name).join(" and ")} ${blocked.length === 1 ? "is" : "are"} part of expenses or payments, so can't be removed.`;
  } else if (added.some((n) => n.length > MAX_MEMBER_NAME)) {
    errors.members = `Names can be up to ${MAX_MEMBER_NAME} characters.`;
  } else if (added.some((n) => n.toLowerCase() === "you")) {
    errors.members = "You're already in the group, so leave yourself out.";
  } else if (new Set(allNames).size !== allNames.length) {
    errors.members = "Two people have the same name. Add a surname or initial.";
  } else if (kept.length + added.length < 2) {
    errors.members = "A group needs at least one other person.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, members: [...kept, ...added.map((n) => ({ id: newId(), name: n }))] } };
}
