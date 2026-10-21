import { describe, expect, it } from "vitest";
import {
  amountToInput,
  buildExpense,
  buildGroup,
  buildGroupEdit,
  buildSettlement,
  draftFromExpense,
  memberInUse,
  previewExpense,
  type ExpenseDraft,
} from "./forms";
import type { Group } from "./types";

const members = ["a", "b", "c"];
const meta = { id: "new", createdAt: "2026-10-05T10:00:00.000Z" };

const draft = (overrides: Partial<ExpenseDraft> = {}): ExpenseDraft => ({
  description: "Dinner",
  amount: "300",
  paidBy: "a",
  category: "food",
  method: "equal",
  included: ["a", "b", "c"],
  values: {},
  ...overrides,
});

describe("previewExpense", () => {
  it("splits equally between the people included", () => {
    const preview = previewExpense(draft({ included: ["a", "b"] }), members);
    expect(preview.errors).toEqual({});
    expect(preview.splits).toEqual([
      { userId: "a", amount: 15000 },
      { userId: "b", amount: 15000 },
    ]);
  });

  it("asks for a description and a valid amount", () => {
    const preview = previewExpense(draft({ description: "  ", amount: "abc" }), members);
    expect(preview.errors.description).toBeDefined();
    expect(preview.errors.amount).toBeDefined();
    expect(preview.splits).toBeNull();
  });

  it("rejects an amount of 0", () => {
    expect(previewExpense(draft({ amount: "0" }), members).errors.amount).toBeDefined();
  });

  it("needs at least one person in an equal split", () => {
    expect(previewExpense(draft({ included: [] }), members).errors.split).toMatch(/at least one/);
  });

  it("splits by shares and leaves out people with 0 shares", () => {
    const preview = previewExpense(draft({ method: "shares", values: { a: "2", b: "1", c: "" } }), members);
    expect(preview.splits).toEqual([
      { userId: "a", amount: 20000 },
      { userId: "b", amount: 10000 },
    ]);
  });

  it("rejects non-whole shares", () => {
    expect(previewExpense(draft({ method: "shares", values: { a: "1.5" } }), members).errors.split).toMatch(/whole/);
  });

  it("tracks what's left to assign in an exact split", () => {
    const preview = previewExpense(draft({ method: "exact", values: { a: "100", b: "50" } }), members);
    expect(preview.remaining).toBe(15000);
    expect(preview.errors.split).toMatch(/still to assign/);
    expect(preview.splits).toBeNull();
  });

  it("flags an exact split that goes over the total", () => {
    const preview = previewExpense(draft({ method: "exact", values: { a: "200", b: "200" } }), members);
    expect(preview.remaining).toBe(-10000);
    expect(preview.errors.split).toMatch(/more than the total/);
  });

  it("accepts an exact split that adds up", () => {
    const preview = previewExpense(draft({ method: "exact", values: { a: "100", b: "200.00" } }), members);
    expect(preview.errors).toEqual({});
    expect(preview.splits).toEqual([
      { userId: "a", amount: 10000 },
      { userId: "b", amount: 20000 },
    ]);
  });
});

describe("buildExpense", () => {
  it("builds an expense whose splits add up to the total", () => {
    const result = buildExpense(draft({ amount: "100" }), members, meta);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(10000);
      expect(result.value.splits.reduce((sum, s) => sum + s.amount, 0)).toBe(10000);
      expect(result.value.description).toBe("Dinner");
    }
  });

  it("returns errors instead of an expense when something is wrong", () => {
    const result = buildExpense(draft({ description: "" }), members, meta);
    expect(result.ok).toBe(false);
  });
});

describe("buildSettlement", () => {
  it("builds a payment", () => {
    expect(buildSettlement({ from: "b", to: "a", amount: "1260.38" }, members, meta)).toEqual({
      ok: true,
      value: { id: "new", from: "b", to: "a", amount: 126038, createdAt: meta.createdAt },
    });
  });

  it("rejects paying yourself and empty amounts", () => {
    const result = buildSettlement({ from: "a", to: "a", amount: "" }, members, meta);
    expect(result).toEqual({
      ok: false,
      errors: { people: expect.any(String), amount: expect.any(String) },
    });
  });
});

describe("amountToInput", () => {
  it.each([
    [126038, "1260.38"],
    [100000, "1000"],
    [5, "0.05"],
  ])("%i -> %s", (amount, expected) => {
    expect(amountToInput(amount)).toBe(expected);
  });
});

describe("draftFromExpense", () => {
  const ids = ["a", "b", "c"];

  it("reopens an equal split as equal, with the same people ticked", () => {
    const built = buildExpense(draft({ amount: "100", included: ["a", "c"] }), ids, meta);
    if (!built.ok) throw new Error("expected a valid expense");
    const reopened = draftFromExpense(built.value, ids);
    expect(reopened).toMatchObject({ method: "equal", included: ["a", "c"], amount: "100", description: "Dinner" });
    // Saving it again without changes gives the same expense.
    expect(buildExpense(reopened, ids, meta)).toEqual(built);
  });

  it("reopens any other split as exact amounts", () => {
    const built = buildExpense(draft({ method: "shares", values: { a: "2", b: "1" } }), ids, meta);
    if (!built.ok) throw new Error("expected a valid expense");
    const reopened = draftFromExpense(built.value, ids);
    expect(reopened.method).toBe("exact");
    expect(reopened.values).toEqual({ a: "200", b: "100" });
    expect(buildExpense(reopened, ids, meta)).toEqual(built);
  });
});

describe("buildGroup", () => {
  const you = { id: "mahi", name: "Mahi" };
  let counter = 0;
  const groupMeta = { id: "g1", createdAt: meta.createdAt, newId: () => `m${++counter}` };

  it("creates a group with you first and blank rows ignored", () => {
    counter = 0;
    const result = buildGroup({ name: "  Manali trip ", memberNames: ["Kabir", " ", "Isha "] }, you, groupMeta);
    expect(result).toEqual({
      ok: true,
      value: {
        id: "g1",
        name: "Manali trip",
        createdAt: meta.createdAt,
        members: [you, { id: "m1", name: "Kabir" }, { id: "m2", name: "Isha" }],
        expenses: [],
        settlements: [],
      },
    });
  });

  it.each([
    ["no name", { name: "", memberNames: ["Kabir"] }, "name"],
    ["nobody else", { name: "Trip", memberNames: ["", " "] }, "members"],
    ["yourself again", { name: "Trip", memberNames: ["mahi"] }, "members"],
    ["the same name twice", { name: "Trip", memberNames: ["Kabir", "kabir"] }, "members"],
  ] as const)("rejects %s", (_, input, field) => {
    const result = buildGroup({ ...input, memberNames: [...input.memberNames] }, you, groupMeta);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field]).toBeDefined();
  });
});

describe("editing a group", () => {
  const group: Group = {
    id: "g",
    name: "Trip",
    createdAt: meta.createdAt,
    members: [
      { id: "a", name: "Mahi" },
      { id: "b", name: "Kabir" },
      { id: "c", name: "Isha" },
    ],
    expenses: [
      {
        id: "e",
        description: "Lunch",
        category: "food",
        amount: 200,
        paidBy: "a",
        splits: [
          { userId: "a", amount: 100 },
          { userId: "b", amount: 100 },
        ],
        createdAt: meta.createdAt,
      },
    ],
    settlements: [],
  };
  let n = 0;
  const newId = () => `new${++n}`;

  it("knows who is part of an expense", () => {
    expect(memberInUse(group, "a")).toBe(true);
    expect(memberInUse(group, "b")).toBe(true);
    expect(memberInUse(group, "c")).toBe(false);
  });

  it("renames, adds people and removes someone with no expenses", () => {
    n = 0;
    const result = buildGroupEdit(group, { name: " Goa trip ", keep: ["b"], newNames: ["Dev", " "] }, "a", newId);
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Goa trip",
        members: [
          { id: "a", name: "Mahi" },
          { id: "b", name: "Kabir" },
          { id: "new1", name: "Dev" },
        ],
      },
    });
  });

  it("always keeps you, even if left out of keep", () => {
    const result = buildGroupEdit(group, { name: "Trip", keep: ["b", "c"], newNames: [] }, "a", newId);
    expect(result.ok && result.value.members.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it.each([
    ["removing someone who is in an expense", { name: "Trip", keep: ["c"], newNames: [] }, "members", /Kabir is part of/],
    ["a name that already exists", { name: "Trip", keep: ["b", "c"], newNames: ["isha"] }, "members", /same name/],
    ["ending up alone", { name: "Trip", keep: [], newNames: [] }, "members", /Kabir is part of/],
    ["an empty name", { name: "  ", keep: ["b", "c"], newNames: [] }, "name", /name/],
  ] as const)("rejects %s", (_, draft, field, message) => {
    const result = buildGroupEdit(group, { ...draft, keep: [...draft.keep], newNames: [...draft.newNames] }, "a", newId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field]).toMatch(message);
  });

  it("rejects a group with only you in it", () => {
    const solo = { ...group, expenses: [] };
    const result = buildGroupEdit(solo, { name: "Trip", keep: [], newNames: [] }, "a", newId);
    expect(!result.ok && result.errors.members).toMatch(/at least one other person/);
  });
});
