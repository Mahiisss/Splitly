"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  buildExpense,
  draftFromExpense,
  EXPENSE_CATEGORIES,
  formatMoney,
  previewExpense,
  type Expense,
  type ExpenseCategory,
  type ExpenseDraft,
  type Member,
  type SplitMethod,
  type UserId,
} from "@splitly/core";
import { categoryStyles } from "@splitly/theme";
import { Avatar } from "./Avatar";
import { CategoryGlyph } from "./CategoryIcon";
import { Dialog } from "./Dialog";
import { button, chip, field, fieldBase, label } from "./ui";

const methods: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "shares", label: "By shares" },
  { value: "exact", label: "Exact amounts" },
];

function emptyDraft(members: Member[], currentUserId: UserId): ExpenseDraft {
  return {
    description: "",
    amount: "",
    paidBy: currentUserId,
    category: "food",
    method: "equal",
    included: members.map((m) => m.id),
    values: {},
  };
}

/** Adds a new expense, or edits `editing` when it's given. */
export function ExpenseDialog({
  open,
  editing,
  onClose,
  onSave,
  members,
  currentUserId,
}: {
  open: boolean;
  editing: Expense | null;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  members: Member[];
  currentUserId: UserId;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit expense" : "Add an expense"}>
      {/* Mounting the form only while open gives it fresh state each time. */}
      {open && (
        <ExpenseForm
          key={editing?.id ?? "new"}
          editing={editing}
          members={members}
          currentUserId={currentUserId}
          onCancel={onClose}
          onSave={onSave}
        />
      )}
    </Dialog>
  );
}

function ExpenseForm({
  editing,
  members,
  currentUserId,
  onCancel,
  onSave,
}: {
  editing: Expense | null;
  members: Member[];
  currentUserId: UserId;
  onCancel: () => void;
  onSave: (expense: Expense) => void;
}) {
  const [draft, setDraft] = useState(() =>
    editing ? draftFromExpense(editing, members.map((m) => m.id)) : emptyDraft(members, currentUserId),
  );
  const [submitted, setSubmitted] = useState(false);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const preview = previewExpense(draft, memberIds);
  const shareOf = new Map(preview.splits?.map((s) => [s.userId, s.amount]));
  const update = (patch: Partial<ExpenseDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const name = (m: Member) => (m.id === currentUserId ? "You" : m.name);

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const meta = editing
      ? { id: editing.id, createdAt: editing.createdAt } // keep its place in the activity feed
      : { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const result = buildExpense(draft, memberIds, meta);
    if (result.ok) onSave(result.value);
  }

  const shownErrors = submitted ? preview.errors : {};

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <div className="space-y-1.5">
            <label htmlFor="expense-description" className={label}>
              What was it for?
            </label>
            <input
              id="expense-description"
              className={field}
              placeholder="Dinner at Thalassa"
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              aria-invalid={!!shownErrors.description}
              aria-describedby="expense-description-error"
              autoFocus={!editing}
            />
            <FieldError id="expense-description-error" message={shownErrors.description} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="expense-amount" className={label}>
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
              <input
                id="expense-amount"
                className={`${field} pl-7 font-semibold`}
                inputMode="decimal"
                placeholder="0.00"
                value={draft.amount}
                onChange={(e) => update({ amount: e.target.value })}
                aria-invalid={!!shownErrors.amount}
                aria-describedby="expense-amount-error"
              />
            </div>
            <FieldError id="expense-amount-error" message={shownErrors.amount} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className={label}>Category</legend>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((category: ExpenseCategory) => (
              <label key={category}>
                <input
                  type="radio"
                  name="category"
                  className="peer sr-only"
                  checked={draft.category === category}
                  onChange={() => update({ category })}
                />
                <span className={chip}>
                  <CategoryGlyph category={category} size={16} />
                  {categoryStyles[category].label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={label}>Paid by</legend>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label key={m.id}>
                <input
                  type="radio"
                  name="paid-by"
                  className="peer sr-only"
                  checked={draft.paidBy === m.id}
                  onChange={() => update({ paidBy: m.id })}
                />
                <span className={`${chip} pl-1.5`}>
                  <Avatar member={m} members={members} size="sm" />
                  {name(m)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className={label}>Split</legend>
          <div className="inline-flex rounded-full bg-canvas p-1" role="radiogroup" aria-label="Split method">
            {methods.map((m) => (
              <label key={m.value}>
                <input
                  type="radio"
                  name="method"
                  className="peer sr-only"
                  checked={draft.method === m.value}
                  onChange={() => update({ method: m.value, values: {} })}
                />
                <span className="inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 text-sm font-medium text-muted peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                  {m.label}
                </span>
              </label>
            ))}
          </div>

          <ul className="divide-y divide-line rounded-xl border border-line">
            {members.map((m) => {
              const share = shareOf.get(m.id);
              const inputId = `split-${m.id}`;
              return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                  {draft.method === "equal" && (
                    <input
                      id={inputId}
                      type="checkbox"
                      className="size-4 accent-ink"
                      checked={draft.included.includes(m.id)}
                      onChange={(e) =>
                        update({
                          included: e.target.checked
                            ? [...draft.included, m.id]
                            : draft.included.filter((id) => id !== m.id),
                        })
                      }
                    />
                  )}
                  <Avatar member={m} members={members} size="sm" />
                  <label htmlFor={inputId} className="min-w-0 flex-1 truncate font-medium">
                    {name(m)}
                  </label>

                  {draft.method !== "equal" && (
                    <div className="relative">
                      {draft.method === "exact" && (
                        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted">₹</span>
                      )}
                      <input
                        id={inputId}
                        inputMode={draft.method === "shares" ? "numeric" : "decimal"}
                        placeholder="0"
                        className={`${fieldBase} h-9 text-right ${draft.method === "exact" ? "w-28 pl-6" : "w-16"}`}
                        value={draft.values[m.id] ?? ""}
                        onChange={(e) => update({ values: { ...draft.values, [m.id]: e.target.value } })}
                      />
                    </div>
                  )}

                  {draft.method !== "exact" && (
                    <span className="w-24 text-right text-sm text-muted">{share ? formatMoney(share) : "–"}</span>
                  )}
                </li>
              );
            })}
          </ul>

          <SplitStatus draft={draft} remaining={preview.remaining} error={preview.errors.split} amount={preview.amount} />
        </fieldset>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
        {submitted && Object.keys(preview.errors).length > 0 && (
          <p role="alert" className="mr-auto text-sm text-owes">
            Fix the highlighted fields to {editing ? "save" : "add"} this expense.
          </p>
        )}
        <button type="button" className={button.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={button.primary}>
          {editing ? "Save changes" : "Add expense"}
        </button>
      </footer>
    </form>
  );
}

function SplitStatus({
  draft,
  remaining,
  error,
  amount,
}: {
  draft: ExpenseDraft;
  remaining: number | null;
  error?: string;
  amount: number | null;
}) {
  if (draft.method === "exact" && amount !== null && remaining === 0) {
    return <p className="text-sm text-owed">Every rupee is assigned.</p>;
  }
  if (error && (draft.method === "exact" || amount !== null)) {
    return (
      <p aria-live="polite" className={`text-sm ${draft.method === "exact" && remaining !== null && remaining > 0 ? "text-muted" : "text-owes"}`}>
        {error}
      </p>
    );
  }
  if (draft.method === "equal" && amount !== null && draft.included.length > 0) {
    return (
      <p className="text-sm text-muted">
        Split between {draft.included.length} {draft.included.length === 1 ? "person" : "people"}.
      </p>
    );
  }
  return null;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="min-h-5 text-sm text-owes">
      {message}
    </p>
  );
}
