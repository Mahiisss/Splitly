import { describe, expect, it } from "vitest";
import { formatDay, groupByDay, joinNames } from "./format";

describe("joinNames", () => {
  it.each([
    [[], ""],
    [["You"], "You"],
    [["You", "Aarav"], "You and Aarav"],
    [["You", "Aarav", "Priya", "Rohan"], "You, Aarav, Priya and Rohan"],
  ])("joins %j", (names, expected) => {
    expect(joinNames(names)).toBe(expected);
  });
});

describe("groupByDay", () => {
  it("puts items from the same day together and keeps their order", () => {
    const items = [
      { id: "a", createdAt: "2026-10-03T12:00:00.000Z" },
      { id: "b", createdAt: "2026-10-03T11:00:00.000Z" },
      { id: "c", createdAt: "2026-10-01T12:00:00.000Z" },
    ];
    const groups = groupByDay(items);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([["a", "b"], ["c"]]);
  });
});

describe("formatDay", () => {
  it("formats a date as weekday, day and month in India time", () => {
    expect(formatDay("2026-10-01T12:00:00.000Z")).toBe("Thursday, 1 October");
  });

  it("puts a late-evening expense on the next day in India, whatever timezone the machine is in", () => {
    // 20:15 UTC on 1 October is 01:45 IST on 2 October.
    expect(formatDay("2026-10-01T20:15:00.000Z")).toBe("Friday, 2 October");
  });

  it("can use another offset", () => {
    expect(formatDay("2026-10-01T20:15:00.000Z", 0)).toBe("Thursday, 1 October");
  });
});
