"use client";

import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { buildGroupEdit, memberInUse, type Group, type GroupEditDraft, type Member, type UserId } from "@splitly/core";
import { avatarColors, initials } from "@splitly/theme";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";
import { button, field, label } from "./ui";

export function EditGroupDialog({
  open,
  group,
  currentUserId,
  onClose,
  onSave,
}: {
  open: boolean;
  group: Group;
  currentUserId: UserId;
  onClose: () => void;
  onSave: (change: { name: string; members: Member[] }) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Edit group">
      {open && <EditGroupForm group={group} currentUserId={currentUserId} onCancel={onClose} onSave={onSave} />}
    </Dialog>
  );
}

function EditGroupForm({
  group,
  currentUserId,
  onCancel,
  onSave,
}: {
  group: Group;
  currentUserId: UserId;
  onCancel: () => void;
  onSave: (change: { name: string; members: Member[] }) => void;
}) {
  const [draft, setDraft] = useState<GroupEditDraft>({
    name: group.name,
    keep: group.members.map((m) => m.id),
    newNames: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const check = buildGroupEdit(group, draft, currentUserId, () => "");
  const errors = submitted && !check.ok ? check.errors : {};
  const kept = group.members.filter((m) => draft.keep.includes(m.id));

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const result = buildGroupEdit(group, draft, currentUserId, () => crypto.randomUUID());
    if (result.ok) onSave(result.value);
  }

  const setNew = (index: number, value: string) =>
    setDraft((d) => ({ ...d, newNames: d.newNames.map((n, i) => (i === index ? value : n)) }));

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <div className="space-y-1.5">
          <label htmlFor="edit-group-name" className={label}>
            Group name
          </label>
          <input
            id="edit-group-name"
            className={field}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            aria-invalid={!!errors.name}
            aria-describedby="edit-group-name-error"
          />
          <p id="edit-group-name-error" className="min-h-5 text-sm text-owes">
            {errors.name}
          </p>
        </div>

        <fieldset className="space-y-2" aria-describedby="edit-group-members-error">
          <legend className={label}>People</legend>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {kept.map((m) => {
              const isYou = m.id === currentUserId;
              const inUse = memberInUse(group, m.id);
              return (
                <li key={m.id} className="flex min-h-12 items-center gap-3 px-3 py-2">
                  <Avatar member={m} members={group.members} size="sm" />
                  <span className="flex-1 font-medium">{isYou ? "You" : m.name}</span>
                  {isYou ? (
                    <span className="text-sm text-muted">Always included</span>
                  ) : inUse ? (
                    <span className="text-sm text-muted" title="People in expenses or payments can't be removed">
                      In expenses
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, keep: d.keep.filter((id) => id !== m.id) }))}
                      aria-label={`Remove ${m.name}`}
                      className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-owes-soft hover:text-owes focus-visible:outline-2 focus-visible:outline-ink"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {draft.newNames.map((name, index) => {
            const color = avatarColors(kept.length + index);
            return (
              <div key={index} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: color.background, color: color.text }}
                >
                  {name.trim() ? initials(name) : "+"}
                </span>
                <input
                  className={field}
                  aria-label={`New person ${index + 1}`}
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setNew(index, e.target.value)}
                  autoFocus={index === draft.newNames.length - 1}
                />
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, newNames: d.newNames.filter((_, i) => i !== index) }))}
                  aria-label={`Remove new person ${index + 1}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, newNames: [...d.newNames, ""] }))}
            className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-semibold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-ink"
          >
            <Plus size={16} aria-hidden />
            Add a person
          </button>
          <p id="edit-group-members-error" className="min-h-5 text-sm text-owes">
            {errors.members}
          </p>
        </fieldset>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
        <button type="button" className={button.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={button.primary}>
          Save changes
        </button>
      </footer>
    </form>
  );
}
