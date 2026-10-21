"use client";

import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { buildGroup, demoCurrentUser, type Group, type GroupDraft } from "@splitly/core";
import { avatarColors, initials } from "@splitly/theme";
import { Dialog } from "./Dialog";
import { button, field, label } from "./ui";

export function NewGroupDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (group: Group) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="New group">
      {open && <GroupForm onCancel={onClose} onCreate={onCreate} />}
    </Dialog>
  );
}

function GroupForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (group: Group) => void }) {
  const [draft, setDraft] = useState<GroupDraft>({ name: "", memberNames: ["", ""] });
  const [submitted, setSubmitted] = useState(false);
  const you = demoCurrentUser;
  const meta = () => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), newId: () => crypto.randomUUID() });
  const check = buildGroup(draft, you, { id: "", createdAt: "", newId: () => "" });
  const errors = submitted && !check.ok ? check.errors : {};

  const setMember = (index: number, value: string) =>
    setDraft((d) => ({ ...d, memberNames: d.memberNames.map((n, i) => (i === index ? value : n)) }));

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const result = buildGroup(draft, you, meta());
    if (result.ok) onCreate(result.value);
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <div className="space-y-1.5">
          <label htmlFor="group-name" className={label}>
            Group name
          </label>
          <input
            id="group-name"
            className={field}
            placeholder="Manali trip"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            aria-invalid={!!errors.name}
            aria-describedby="group-name-error"
            autoFocus
          />
          <p id="group-name-error" className="min-h-5 text-sm text-owes">
            {errors.name}
          </p>
        </div>

        <fieldset className="space-y-2" aria-describedby="group-members-error">
          <legend className={label}>Who&apos;s in it?</legend>
          <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: avatarColors(0).background, color: avatarColors(0).text }}
            >
              {initials(you.name)}
            </span>
            <span className="font-medium">You</span>
            <span className="ml-auto text-sm text-muted">Always included</span>
          </div>

          {draft.memberNames.map((name, index) => {
            const color = avatarColors(index + 1);
            return (
              <div key={index} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: color.background, color: color.text }}
                >
                  {name.trim() ? initials(name) : index + 2}
                </span>
                <input
                  className={field}
                  aria-label={`Person ${index + 2}`}
                  placeholder={["Kabir", "Isha", "Arjun", "Meera"][index % 4]}
                  value={name}
                  onChange={(e) => setMember(index, e.target.value)}
                />
                {draft.memberNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, memberNames: d.memberNames.filter((_, i) => i !== index) }))}
                    aria-label={`Remove person ${index + 2}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                  >
                    <X size={16} aria-hidden />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, memberNames: [...d.memberNames, ""] }))}
            className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-semibold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-ink"
          >
            <Plus size={16} aria-hidden />
            Add another person
          </button>
          <p id="group-members-error" className="min-h-5 text-sm text-owes">
            {errors.members}
          </p>
        </fieldset>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
        <button type="button" className={button.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={button.primary}>
          Create group
        </button>
      </footer>
    </form>
  );
}
