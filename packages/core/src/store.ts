import { computeBalances } from "./balances";
import type { ActivityItem } from "./summary";
import { EXPENSE_CATEGORIES, type AppState, type Expense, type Group, type GroupState, type Member, type Settlement } from "./types";

/**
 * All of Splitly's state changes go through the two reducers in this file.
 * Web uses them with useReducer + localStorage, mobile with useReducer +
 * AsyncStorage, so both apps behave exactly the same.
 */

// ---------------------------------------------------------------------------
// One group
// ---------------------------------------------------------------------------

export type GroupAction =
  | { type: "addExpense"; expense: Expense }
  /** Replaces the expense with the same id (editing). */
  | { type: "updateExpense"; expense: Expense }
  | { type: "addSettlement"; settlement: Settlement }
  /** Removes the expense or payment with this id. */
  | { type: "remove"; id: string }
  /** Puts back something that was removed (the "Undo" button). */
  | { type: "restore"; item: ActivityItem }
  /** Replaces everything, e.g. when resetting to the sample data. */
  | { type: "replace"; state: GroupState };

export function groupReducer<T extends GroupState>(state: T, action: GroupAction): T {
  switch (action.type) {
    case "addExpense":
      return { ...state, expenses: [...state.expenses, action.expense] };
    case "updateExpense":
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.expense.id ? action.expense : e)),
      };
    case "addSettlement":
      return { ...state, settlements: [...state.settlements, action.settlement] };
    case "remove":
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.id),
        settlements: state.settlements.filter((s) => s.id !== action.id),
      };
    case "restore":
      if (action.item.kind === "expense") {
        if (state.expenses.some((e) => e.id === action.item.id)) return state;
        return { ...state, expenses: [...state.expenses, action.item.expense] };
      }
      if (state.settlements.some((s) => s.id === action.item.id)) return state;
      return { ...state, settlements: [...state.settlements, action.item.settlement] };
    case "replace":
      return { ...state, expenses: action.state.expenses, settlements: action.state.settlements };
  }
}

// ---------------------------------------------------------------------------
// The whole app (all groups)
// ---------------------------------------------------------------------------

export type AppAction =
  | { type: "createGroup"; group: Group }
  | { type: "deleteGroup"; id: string }
  /** Puts a deleted group back where it was (the "Undo" button). */
  | { type: "restoreGroup"; group: Group; index: number }
  /** Renames a group and/or changes who is in it (see buildGroupEdit). */
  | { type: "updateGroup"; groupId: string; name: string; members: Member[] }
  /** Applies a GroupAction to one group. */
  | { type: "group"; groupId: string; action: GroupAction }
  | { type: "replace"; state: AppState };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "createGroup":
      return { groups: [...state.groups, action.group] };
    case "deleteGroup":
      return { groups: state.groups.filter((g) => g.id !== action.id) };
    case "restoreGroup": {
      if (state.groups.some((g) => g.id === action.group.id)) return state;
      const groups = [...state.groups];
      groups.splice(Math.min(Math.max(action.index, 0), groups.length), 0, action.group);
      return { groups };
    }
    case "updateGroup":
      return {
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, name: action.name, members: action.members } : g,
        ),
      };
    case "group":
      return {
        groups: state.groups.map((g) => (g.id === action.groupId ? groupReducer(g, action.action) : g)),
      };
    case "replace":
      return action.state;
  }
}

// ---------------------------------------------------------------------------
// Saving and loading
// ---------------------------------------------------------------------------

/** Bump this if the saved shape changes, and teach loadAppState to upgrade the old one. */
export const STORAGE_VERSION = 2;

/** Where the whole app is saved (version 2 and later). */
export const APP_STORAGE_KEY = "splitly:app";

/** The first version of the app saved a single group under this key. */
export const LEGACY_GROUP_STORAGE_KEY = "splitly:group:goa-trip";

export function serializeAppState(state: AppState): string {
  return JSON.stringify({ version: STORAGE_VERSION, ...state });
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isAmount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

function isExpense(value: unknown): value is Expense {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.description) &&
    isString(value.paidBy) &&
    isString(value.createdAt) &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(value.category as string) &&
    isAmount(value.amount) &&
    Array.isArray(value.splits) &&
    value.splits.every((s) => isRecord(s) && isString(s.userId) && isAmount(s.amount))
  );
}

function isSettlement(value: unknown): value is Settlement {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.from) &&
    isString(value.to) &&
    isString(value.createdAt) &&
    isAmount(value.amount)
  );
}

function isMember(value: unknown): value is Member {
  return isRecord(value) && isString(value.id) && isString(value.name);
}

function isGroupState(value: Record<string, unknown>): boolean {
  const { expenses, settlements } = value;
  if (!Array.isArray(expenses) || !expenses.every(isExpense)) return false;
  if (!Array.isArray(settlements) || !settlements.every(isSettlement)) return false;
  computeBalances(expenses, settlements); // throws if any expense's splits don't add up
  return true;
}

function isGroup(value: unknown): value is Group {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.createdAt) &&
    Array.isArray(value.members) &&
    value.members.length > 0 &&
    value.members.every(isMember) &&
    isGroupState(value)
  );
}

/**
 * Reads what serializeAppState wrote. Returns null for anything that isn't a
 * valid save (missing, wrong version, hand-edited, corrupted), so the app can
 * fall back to its starting data instead of crashing.
 */
export function parseAppState(text: string | null): AppState | null {
  if (!text) return null;
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data.version !== STORAGE_VERSION) return null;
    if (!Array.isArray(data.groups) || !data.groups.every(isGroup)) return null;
    return { groups: data.groups };
  } catch {
    return null;
  }
}

/** Reads a version 1 save (one group's expenses and payments). */
export function parseGroupState(text: string | null): GroupState | null {
  if (!text) return null;
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data.version !== 1 || !isGroupState(data)) return null;
    return { expenses: data.expenses as Expense[], settlements: data.settlements as Settlement[] };
  } catch {
    return null;
  }
}

/**
 * Works out the state to start the app with, from whatever is saved:
 * a current save wins; otherwise a version 1 save is upgraded by putting its
 * expenses into the matching sample group; otherwise the sample data is used.
 */
export function loadAppState(
  saved: { app: string | null; legacyGroup: string | null },
  sample: AppState,
  legacyGroupId: string,
): AppState {
  const current = parseAppState(saved.app);
  if (current) return current;

  const legacy = parseGroupState(saved.legacyGroup);
  if (legacy) {
    return {
      groups: sample.groups.map((g) => (g.id === legacyGroupId ? groupReducer(g, { type: "replace", state: legacy }) : g)),
    };
  }
  return sample;
}
