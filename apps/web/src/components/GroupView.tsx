"use client";

import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  amountToInput,
  currentUserId,
  formatMoney,
  joinNames,
  settleUpMessage,
  summarizeGroup,
  type ActivityItem,
  type Expense,
  type Group,
  type GroupAction,
  type Member,
  type PaymentDraft,
  type Settlement,
  type Transfer,
} from "@splitly/core";
import { useAppStore } from "@/lib/AppStore";
import { ActivityFeed } from "./ActivityFeed";
import { AvatarStack } from "./Avatar";
import { BalanceChart } from "./BalanceChart";
import { EditGroupDialog } from "./EditGroupDialog";
import { ExpenseDialog } from "./ExpenseDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { SettleUp } from "./SettleUp";
import { button } from "./ui";

export function yourPosition(balance: number): string {
  if (balance > 0) return `You get back ${formatMoney(balance)}.`;
  if (balance < 0) return `You owe ${formatMoney(-balance)}.`;
  return "You're all settled up.";
}

/** Copies text, or opens the phone's share sheet where the browser supports it. */
async function shareText(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return "shared";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export function GroupView({ group }: { group: Group }) {
  const { app, dispatch, showToast } = useAppStore();
  const router = useRouter();
  const members = group.members;

  const [expenseDialog, setExpenseDialog] = useState<{ editing: Expense | null } | null>(null);
  const [payment, setPayment] = useState<PaymentDraft | null>(null);
  const [editingGroup, setEditingGroup] = useState(false);

  const summary = useMemo(
    () => summarizeGroup(members, group.expenses, group.settlements),
    [members, group.expenses, group.settlements],
  );
  const myBalance = summary.balances.find((b) => b.member.id === currentUserId)?.balance ?? 0;
  const otherMember = members.find((m) => m.id !== currentUserId)?.id ?? currentUserId;
  const act = (action: GroupAction) => dispatch({ type: "group", groupId: group.id, action });

  function saveExpense(expense: Expense) {
    const editing = expenseDialog?.editing;
    act(editing ? { type: "updateExpense", expense } : { type: "addExpense", expense });
    setExpenseDialog(null);
    showToast({ message: editing ? "Changes saved." : `Added “${expense.description}”.` });
  }

  function recordPayment(settlement: Settlement) {
    act({ type: "addSettlement", settlement });
    setPayment(null);
    showToast({ message: `Payment of ${formatMoney(settlement.amount)} recorded.` });
  }

  function remove(item: ActivityItem) {
    act({ type: "remove", id: item.id });
    const what = item.kind === "expense" ? `“${item.expense.description}”` : "Payment";
    showToast({ message: `${what} deleted.`, onUndo: () => act({ type: "restore", item }) });
  }

  function markPaid(t: Transfer) {
    setPayment({ from: t.from, to: t.to, amount: amountToInput(t.amount) });
  }

  async function share() {
    const result = await shareText(settleUpMessage(group));
    if (result === "copied") showToast({ message: "Copied. Paste it into your group chat." });
    if (result === "failed") showToast({ message: "Couldn't copy. Your browser blocked it." });
  }

  function saveGroup(change: { name: string; members: Member[] }) {
    dispatch({ type: "updateGroup", groupId: group.id, ...change });
    setEditingGroup(false);
    showToast({ message: "Group updated." });
  }

  function deleteGroup() {
    const index = app.groups.findIndex((g) => g.id === group.id);
    dispatch({ type: "deleteGroup", id: group.id });
    router.push("/");
    showToast({
      message: `“${group.name}” deleted.`,
      onUndo: () => dispatch({ type: "restoreGroup", group, index }),
    });
  }

  return (
    <>
      {/* Browser tab title, e.g. "Goa Trip · Splitly". React moves it into <head> and removes it when you leave. */}
      <title>{`${group.name} · Splitly`}</title>
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          All groups
        </Link>
        <button
          type="button"
          onClick={() => setEditingGroup(true)}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <Pencil size={15} aria-hidden />
          Edit group
        </button>
      </div>

      <section className="flex flex-wrap items-end justify-between gap-6 pt-6 pb-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <AvatarStack members={members} />
            <p className="text-sm text-muted">{joinNames(members.map((m) => (m.id === currentUserId ? "You" : m.name)))}</p>
          </div>
          <h1 className="mt-5 font-display text-5xl font-bold tracking-tight break-words sm:text-6xl">{group.name}</h1>
          <p className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">{yourPosition(myBalance)}</p>
          <p className="mt-2 text-muted">
            {group.expenses.length === 0
              ? "No expenses yet."
              : `The group has spent ${formatMoney(summary.totalSpent)} across ${group.expenses.length} expense${
                  group.expenses.length === 1 ? "" : "s"
                }.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={button.secondary}
            onClick={() => setPayment({ from: otherMember, to: currentUserId, amount: "" })}
          >
            Record a payment
          </button>
          <button type="button" className={button.primary} onClick={() => setExpenseDialog({ editing: null })}>
            <Plus size={18} strokeWidth={2.25} aria-hidden />
            Add expense
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <BalanceChart balances={summary.balances} members={members} currentUserId={currentUserId} />
        </div>
        <SettleUp
          transfers={summary.transfers}
          members={members}
          currentUserId={currentUserId}
          onMarkPaid={markPaid}
          onShare={share}
          className="lg:sticky lg:top-6 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1"
        />
        <ActivityFeed
          activity={summary.activity}
          members={members}
          currentUserId={currentUserId}
          onDelete={remove}
          onEdit={(expense) => setExpenseDialog({ editing: expense })}
          onAddExpense={() => setExpenseDialog({ editing: null })}
          className="lg:col-span-7"
        />
      </div>

      <footer className="mt-12 border-t border-line pt-6">
        <button
          type="button"
          onClick={deleteGroup}
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-owes hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <Trash2 size={15} aria-hidden />
          Delete this group
        </button>
      </footer>

      <ExpenseDialog
        open={expenseDialog !== null}
        editing={expenseDialog?.editing ?? null}
        onClose={() => setExpenseDialog(null)}
        onSave={saveExpense}
        members={members}
        currentUserId={currentUserId}
      />
      <EditGroupDialog
        open={editingGroup}
        group={group}
        currentUserId={currentUserId}
        onClose={() => setEditingGroup(false)}
        onSave={saveGroup}
      />
      <RecordPaymentDialog
        open={payment !== null}
        initial={payment ?? { from: otherMember, to: currentUserId, amount: "" }}
        onClose={() => setPayment(null)}
        onRecord={recordPayment}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}
