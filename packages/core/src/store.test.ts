import { describe, expect, it } from "vitest";
import { goaTripExpenses, goaTripSettlements, sampleAppState } from "./sample";
import {
  appReducer,
  groupReducer,
  loadAppState,
  parseAppState,
  parseGroupState,
  serializeAppState,
} from "./store";
import type { AppState, Expense, Group, GroupState, Settlement } from "./types";

const initial: GroupState = { expenses: goaTripExpenses, settlements: goaTripSettlements };
const dinner: Expense = {
  id: "new-expense",
  description: "Dinner",
  category: "food",
  amount: 1000,
  paidBy: "mahi",
  splits: [
    { userId: "mahi", amount: 500 },
    { userId: "aarav", amount: 500 },
  ],
  createdAt: "2026-10-04T12:00:00.000Z",
};
const payment: Settlement = { id: "new-payment", from: "aarav", to: "mahi", amount: 500, createdAt: "2026-10-04T13:00:00.000Z" };

describe("groupReducer", () => {
  it("adds expenses and payments without changing the old state", () => {
    const next = groupReducer(groupReducer(initial, { type: "addExpense", expense: dinner }), {
      type: "addSettlement",
      settlement: payment,
    });
    expect(next.expenses).toHaveLength(initial.expenses.length + 1);
    expect(next.settlements).toHaveLength(initial.settlements.length + 1);
    expect(initial.expenses).toHaveLength(goaTripExpenses.length);
  });

  it("updates an expense in place", () => {
    const withDinner = groupReducer(initial, { type: "addExpense", expense: dinner });
    const edited = groupReducer(withDinner, { type: "updateExpense", expense: { ...dinner, description: "Late dinner" } });
    expect(edited.expenses.filter((e) => e.id === dinner.id).map((e) => e.description)).toEqual(["Late dinner"]);
    expect(edited.expenses).toHaveLength(withDinner.expenses.length);
  });

  it("removes an expense or a payment by id", () => {
    const withBoth = { expenses: [...initial.expenses, dinner], settlements: [...initial.settlements, payment] };
    const next = groupReducer(groupReducer(withBoth, { type: "remove", id: "new-expense" }), {
      type: "remove",
      id: "new-payment",
    });
    expect(next).toEqual(initial);
  });

  it("restores something that was removed, once", () => {
    const removed = groupReducer({ ...initial, expenses: [...initial.expenses, dinner] }, { type: "remove", id: dinner.id });
    const item = { kind: "expense" as const, id: dinner.id, createdAt: dinner.createdAt, expense: dinner };
    const restored = groupReducer(removed, { type: "restore", item });
    expect(restored.expenses.filter((e) => e.id === dinner.id)).toHaveLength(1);
    expect(groupReducer(restored, { type: "restore", item })).toBe(restored);
  });

  it("keeps a group's name and members when replacing its expenses", () => {
    const group = sampleAppState.groups[0]!;
    const emptied = groupReducer(group, { type: "replace", state: { expenses: [], settlements: [] } });
    expect(emptied.name).toBe(group.name);
    expect(emptied.members).toBe(group.members);
    expect(emptied.expenses).toEqual([]);
  });
});

describe("appReducer", () => {
  const newGroup: Group = {
    id: "g-new",
    name: "Office lunches",
    createdAt: "2026-10-10T10:00:00.000Z",
    members: [
      { id: "mahi", name: "Mahi" },
      { id: "x", name: "Xavier" },
    ],
    expenses: [],
    settlements: [],
  };

  it("creates, deletes and restores a group in its old position", () => {
    const created = appReducer(sampleAppState, { type: "createGroup", group: newGroup });
    expect(created.groups.map((g) => g.id)).toEqual(["goa-trip", "flat-302", "g-new"]);

    const first = created.groups[0]!;
    const deleted = appReducer(created, { type: "deleteGroup", id: first.id });
    expect(deleted.groups.map((g) => g.id)).toEqual(["flat-302", "g-new"]);

    const restored = appReducer(deleted, { type: "restoreGroup", group: first, index: 0 });
    expect(restored.groups.map((g) => g.id)).toEqual(["goa-trip", "flat-302", "g-new"]);
    expect(appReducer(restored, { type: "restoreGroup", group: first, index: 0 })).toBe(restored);
  });

  it("renames a group and changes its members", () => {
    const members = [{ id: "mahi", name: "Mahi" }, { id: "kabir", name: "Kabir" }];
    const next = appReducer(sampleAppState, { type: "updateGroup", groupId: "flat-302", name: "Flat 303", members });
    expect(next.groups[1]).toMatchObject({ name: "Flat 303", members });
    expect(next.groups[1]!.expenses).toBe(sampleAppState.groups[1]!.expenses);
    expect(next.groups[0]).toBe(sampleAppState.groups[0]);
  });

  it("sends group actions to the right group only", () => {
    const next = appReducer(sampleAppState, { type: "group", groupId: "flat-302", action: { type: "addExpense", expense: dinner } });
    expect(next.groups[1]!.expenses).toHaveLength(sampleAppState.groups[1]!.expenses.length + 1);
    expect(next.groups[0]).toBe(sampleAppState.groups[0]);
  });
});

describe("saving and loading", () => {
  it("round-trips through JSON", () => {
    expect(parseAppState(serializeAppState(sampleAppState))).toEqual(sampleAppState);
  });

  const v2 = (groups: unknown) => JSON.stringify({ version: 2, groups });
  const goa = sampleAppState.groups[0]!;

  it.each([
    ["nothing saved", null],
    ["not JSON", "{oops"],
    ["a different version", JSON.stringify({ version: 3, groups: [] })],
    ["a group without members", v2([{ ...goa, members: [] }])],
    ["a float amount", v2([{ ...goa, expenses: [{ ...dinner, amount: 10.5 }] }])],
    ["an unknown category", v2([{ ...goa, expenses: [{ ...dinner, category: "cars" }] }])],
    ["splits that don't add up", v2([{ ...goa, expenses: [{ ...dinner, amount: 999 }] }])],
  ])("ignores %s", (_, text) => {
    expect(parseAppState(text)).toBeNull();
  });
});

describe("loadAppState", () => {
  const legacySave = JSON.stringify({ version: 1, expenses: [dinner], settlements: [] });

  it("prefers the current save", () => {
    const saved: AppState = { groups: [sampleAppState.groups[1]!] };
    expect(loadAppState({ app: serializeAppState(saved), legacyGroup: legacySave }, sampleAppState, "goa-trip")).toEqual(saved);
  });

  it("upgrades a version 1 save into the matching sample group", () => {
    const loaded = loadAppState({ app: null, legacyGroup: legacySave }, sampleAppState, "goa-trip");
    expect(loaded.groups.map((g) => g.id)).toEqual(["goa-trip", "flat-302"]);
    expect(loaded.groups[0]!.expenses).toEqual([dinner]);
    expect(loaded.groups[1]).toBe(sampleAppState.groups[1]);
  });

  it("falls back to the sample data", () => {
    expect(loadAppState({ app: "{broken", legacyGroup: null }, sampleAppState, "goa-trip")).toBe(sampleAppState);
  });

  it("reads version 1 saves only", () => {
    expect(parseGroupState(legacySave)).toEqual({ expenses: [dinner], settlements: [] });
    expect(parseGroupState(JSON.stringify({ version: 2, expenses: [], settlements: [] }))).toBeNull();
  });
});
