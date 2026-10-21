"use client";

import { useState, type FormEvent } from "react";
import { buildSettlement, type Member, type PaymentDraft, type Settlement, type UserId } from "@splitly/core";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";
import { button, chip, field, label } from "./ui";

export function RecordPaymentDialog({
  open,
  initial,
  onClose,
  onRecord,
  members,
  currentUserId,
}: {
  open: boolean;
  /** Pre-filled values, e.g. from a "Mark as paid" button in Settle up. */
  initial: PaymentDraft;
  onClose: () => void;
  onRecord: (settlement: Settlement) => void;
  members: Member[];
  currentUserId: UserId;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Record a payment">
      {open && (
        <PaymentForm
          initial={initial}
          members={members}
          currentUserId={currentUserId}
          onCancel={onClose}
          onRecord={onRecord}
        />
      )}
    </Dialog>
  );
}

function PaymentForm({
  initial,
  members,
  currentUserId,
  onCancel,
  onRecord,
}: {
  initial: PaymentDraft;
  members: Member[];
  currentUserId: UserId;
  onCancel: () => void;
  onRecord: (settlement: Settlement) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const memberIds = members.map((m) => m.id);
  const result = buildSettlement(draft, memberIds, { id: "preview", createdAt: "" });
  const errors = submitted && !result.ok ? result.errors : {};
  const name = (m: Member) => (m.id === currentUserId ? "You" : m.name);

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const final = buildSettlement(draft, memberIds, { id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    if (final.ok) onRecord(final.value);
  }

  const people = (key: "from" | "to", legend: string) => (
    <fieldset className="space-y-2">
      <legend className={label}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <label key={m.id}>
            <input
              type="radio"
              name={key}
              className="peer sr-only"
              checked={draft[key] === m.id}
              onChange={() => setDraft((d) => ({ ...d, [key]: m.id }))}
            />
            <span className={`${chip} pl-1.5`}>
              <Avatar member={m} members={members} size="sm" />
              {name(m)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {people("from", "Who paid?")}
        {people("to", "Who got the money?")}
        {errors.people && <p className="-mt-3 text-sm text-owes">{errors.people}</p>}

        <div className="space-y-1.5">
          <label htmlFor="payment-amount" className={label}>
            Amount
          </label>
          <div className="relative max-w-56">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
            <input
              id="payment-amount"
              className={`${field} pl-7 font-semibold`}
              inputMode="decimal"
              placeholder="0.00"
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              aria-invalid={!!errors.amount}
              aria-describedby="payment-amount-error"
            />
          </div>
          <p id="payment-amount-error" className="min-h-5 text-sm text-owes">
            {errors.amount}
          </p>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
        <button type="button" className={button.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={button.primary}>
          Record payment
        </button>
      </footer>
    </form>
  );
}
