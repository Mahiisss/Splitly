import { ArrowRight, Check, Share2 } from "lucide-react";
import { formatMoney, type Member, type Transfer, type UserId } from "@splitly/core";
import { Avatar } from "./Avatar";

const panelButton =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-on-panel/25 px-3 text-xs font-semibold text-on-panel hover:border-on-panel/70 hover:bg-on-panel/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-panel";

export function SettleUp({
  transfers,
  members,
  currentUserId,
  onMarkPaid,
  onShare,
  className = "",
}: {
  transfers: Transfer[];
  members: Member[];
  currentUserId: UserId;
  /** Opens "Record a payment" pre-filled with this suggestion. */
  onMarkPaid: (transfer: Transfer) => void;
  /** Shares the plan as text, e.g. to paste into the group's chat. */
  onShare: () => void;
  className?: string;
}) {
  const byId = new Map(members.map((m) => [m.id, m]));
  const name = (id: UserId, capital = true) => (id === currentUserId ? (capital ? "You" : "you") : (byId.get(id)?.name ?? id));

  return (
    <section aria-labelledby="settle-title" className={`rounded-[20px] bg-panel p-5 text-on-panel sm:p-7 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <h2 id="settle-title" className="font-display text-xl font-semibold">
          Settle up
        </h2>
        {transfers.length > 0 && (
          <button type="button" onClick={onShare} className={panelButton}>
            <Share2 size={14} aria-hidden />
            Share
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-on-panel/90">
        {transfers.length === 0
          ? "Everyone is square. Nothing to pay."
          : `${transfers.length} payment${transfers.length === 1 ? "" : "s"} clear every balance in the group.`}
      </p>

      <ul className="mt-6 space-y-3">
        {transfers.map((t) => {
          const from = byId.get(t.from);
          const to = byId.get(t.to);
          const involvesYou = t.from === currentUserId || t.to === currentUserId;
          const sentence = `${name(t.from)} ${t.from === currentUserId ? "pay" : "pays"} ${name(t.to, false)}`;
          return (
            <li
              key={`${t.from}-${t.to}`}
              className={`rounded-xl bg-panel-raised p-4 ${involvesYou ? "ring-1 ring-highlight" : ""}`}
            >
              <div className="flex items-center gap-2">
                {from && <Avatar member={from} members={members} size="sm" />}
                <ArrowRight size={16} className="text-on-panel/50" aria-hidden />
                {to && <Avatar member={to} members={members} size="sm" />}
                <span className="ml-1 text-sm text-on-panel/80">{sentence}</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="font-display text-2xl font-semibold tracking-tight">{formatMoney(t.amount)}</p>
                <button
                  type="button"
                  onClick={() => onMarkPaid(t)}
                  aria-label={`Mark as paid: ${sentence} ${formatMoney(t.amount)}`}
                  className={panelButton}
                >
                  <Check size={14} aria-hidden />
                  Mark as paid
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
