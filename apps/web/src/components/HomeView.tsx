"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  demoCurrentUserId,
  formatMoney,
  sampleAppState,
  yourBalance,
  type Group,
} from "@splitly/core";
import { useAppStore } from "@/lib/AppStore";
import { AvatarStack } from "./Avatar";
import { NewGroupDialog } from "./NewGroupDialog";
import { Skeleton } from "./Skeleton";
import { button } from "./ui";

function overallSentence(total: number, groupCount: number): string {
  if (groupCount === 0) return "Create a group for your next trip, your flat or office lunches.";
  if (total > 0) return `Overall, you get back ${formatMoney(total)}.`;
  if (total < 0) return `Overall, you owe ${formatMoney(-total)}.`;
  return "You're settled up everywhere.";
}

export function HomeView() {
  const { app, loaded, dispatch, showToast } = useAppStore();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  if (!loaded) return <Skeleton />;

  const balances = app.groups.map((g) => yourBalance(g, demoCurrentUserId));
  const total = balances.reduce((sum, b) => sum + b, 0);

  function create(group: Group) {
    dispatch({ type: "createGroup", group });
    setCreating(false);
    showToast({ message: `Created “${group.name}”.` });
    router.push(`/groups/${group.id}`);
  }

  function resetSampleData() {
    const previous = app;
    dispatch({ type: "replace", state: sampleAppState });
    showToast({ message: "Sample data restored.", onUndo: () => dispatch({ type: "replace", state: previous }) });
  }

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-6 pt-6 pb-10 sm:pt-10">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">Your groups</h1>
          <p className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {overallSentence(total, app.groups.length)}
          </p>
        </div>
        <button type="button" className={button.primary} onClick={() => setCreating(true)}>
          <Plus size={18} strokeWidth={2.25} aria-hidden />
          New group
        </button>
      </section>

      {app.groups.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-line px-6 py-14 text-center">
          <p className="font-medium">No groups yet.</p>
          <p className="mt-1 text-sm text-muted">Groups keep each trip, flat or hobby&apos;s expenses separate.</p>
          <button type="button" className={`${button.secondary} mt-5`} onClick={() => setCreating(true)}>
            Create your first group
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {app.groups.map((group, index) => (
            <li key={group.id}>
              <GroupCard group={group} balance={balances[index] ?? 0} />
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-6 text-sm text-muted">
        <p>Your groups are saved in this browser.</p>
        <button
          type="button"
          onClick={resetSampleData}
          className="font-medium text-ink underline underline-offset-4 hover:decoration-marigold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Reset to sample data
        </button>
      </footer>

      <NewGroupDialog open={creating} onClose={() => setCreating(false)} onCreate={create} />
    </>
  );
}

function GroupCard({ group, balance }: { group: Group; balance: number }) {
  const spent = group.expenses.reduce((sum, e) => sum + e.amount, 0);
  const status =
    balance > 0
      ? { text: `You get back ${formatMoney(balance)}`, className: "text-owed" }
      : balance < 0
        ? { text: `You owe ${formatMoney(-balance)}`, className: "text-owes" }
        : { text: "Settled up", className: "text-muted" };

  return (
    <Link
      href={`/groups/${group.id}`}
      className="group flex h-full flex-col rounded-[20px] border border-line bg-surface p-5 transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight break-words">{group.name}</h2>
        <ChevronRight size={20} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <AvatarStack members={group.members} />
        <span className="text-sm text-muted">
          {group.members.length} {group.members.length === 1 ? "person" : "people"}
        </span>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-4">
        <p className={`font-semibold ${status.className}`}>{status.text}</p>
        <p className="text-sm text-muted">
          {group.expenses.length === 0
            ? "No expenses yet"
            : `${formatMoney(spent)} spent in ${group.expenses.length} expense${group.expenses.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </Link>
  );
}
