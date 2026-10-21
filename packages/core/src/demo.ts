import { splitByShares, splitEqually, splitExact } from "./splits";
import type { AppState, Expense, Group, Member, Settlement, UserId } from "./types";

/**
 * Sample data so the web and mobile apps have something to show before the
 * database is connected. Both apps import this same file, which proves the
 * shared-package setup works.
 */
export const demoGroup = { id: "goa-trip", name: "Goa Trip", currency: "INR" };

/** The app is shown from Mahi's point of view ("you"). Sign-in replaces this in week 2. */
export const demoCurrentUser: Member = { id: "mahi", name: "Mahi" };
export const demoCurrentUserId: UserId = demoCurrentUser.id;

export const demoMembers: Member[] = [
  demoCurrentUser,
  { id: "aarav", name: "Aarav" },
  { id: "priya", name: "Priya" },
  { id: "rohan", name: "Rohan" },
];

const everyone = demoMembers.map((m) => m.id);

export const demoExpenses: Expense[] = [
  {
    id: "e1",
    description: "Villa booking (2 nights)",
    category: "stay",
    amount: 1_200_000, // ₹12,000.00
    paidBy: "mahi",
    splits: splitEqually(1_200_000, everyone),
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "e2",
    description: "Scooter rentals",
    category: "travel",
    amount: 240_000,
    paidBy: "aarav",
    // Priya and Rohan shared one scooter, so they pay half as much each.
    splits: splitByShares(240_000, [
      { userId: "mahi", shares: 2 },
      { userId: "aarav", shares: 2 },
      { userId: "priya", shares: 1 },
      { userId: "rohan", shares: 1 },
    ]),
    createdAt: "2026-10-01T12:30:00.000Z",
  },
  {
    id: "e3",
    description: "Seafood dinner",
    category: "food",
    amount: 648_050,
    paidBy: "priya",
    splits: splitEqually(648_050, everyone),
    createdAt: "2026-10-01T20:15:00.000Z",
  },
  {
    id: "e4",
    description: "Groceries & snacks",
    category: "groceries",
    amount: 95_000,
    paidBy: "rohan",
    splits: splitExact(95_000, [
      { userId: "mahi", amount: 20_000 },
      { userId: "aarav", amount: 35_000 },
      { userId: "priya", amount: 20_000 },
      { userId: "rohan", amount: 20_000 },
    ]),
    createdAt: "2026-10-02T09:00:00.000Z",
  },
];

export const demoSettlements: Settlement[] = [
  { id: "s1", from: "rohan", to: "mahi", amount: 100_000, createdAt: "2026-10-03T08:00:00.000Z" },
];

// ---------------------------------------------------------------------------
// A second sample group, so the home screen shows more than one.
// ---------------------------------------------------------------------------

const flatMembers: Member[] = [demoCurrentUser, { id: "kabir", name: "Kabir" }, { id: "isha", name: "Isha" }];
const flatmates = flatMembers.map((m) => m.id);

const flatGroup: Group = {
  id: "flat-302",
  name: "Flat 302",
  members: flatMembers,
  createdAt: "2026-09-01T06:00:00.000Z",
  expenses: [
    {
      id: "f1",
      description: "October rent",
      category: "rent",
      amount: 4_500_000, // ₹45,000.00
      paidBy: "kabir",
      // Mahi has the bigger room, so pays 2 shares of 4.
      splits: splitByShares(4_500_000, [
        { userId: "mahi", shares: 2 },
        { userId: "kabir", shares: 1 },
        { userId: "isha", shares: 1 },
      ]),
      createdAt: "2026-10-01T04:30:00.000Z",
    },
    {
      id: "f2",
      description: "Electricity bill",
      category: "bills",
      amount: 284_000,
      paidBy: "isha",
      splits: splitEqually(284_000, flatmates),
      createdAt: "2026-10-04T13:00:00.000Z",
    },
    {
      id: "f3",
      description: "Wi-Fi (3 months)",
      category: "bills",
      amount: 177_000,
      paidBy: "mahi",
      splits: splitEqually(177_000, flatmates),
      createdAt: "2026-10-06T07:45:00.000Z",
    },
    {
      id: "f4",
      description: "Weekly vegetables",
      category: "groceries",
      amount: 64_000,
      paidBy: "mahi",
      splits: splitEqually(64_000, flatmates),
      createdAt: "2026-10-08T03:15:00.000Z",
    },
  ],
  settlements: [],
};

const goaGroup: Group = {
  id: demoGroup.id,
  name: demoGroup.name,
  members: demoMembers,
  createdAt: "2026-09-28T10:00:00.000Z",
  expenses: demoExpenses,
  settlements: demoSettlements,
};

/** What a new install starts with. */
export const sampleAppState: AppState = { groups: [goaGroup, flatGroup] };
