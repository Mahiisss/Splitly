import { formatMoney, type Member, type MemberBalance, type UserId } from "@splitly/core";
import { Avatar } from "./Avatar";

/**
 * A diverging bar chart: the line in the middle is zero. Bars to the right
 * are money a person gets back, bars to the left are money they owe.
 */
export function BalanceChart({
  balances,
  members,
  currentUserId,
}: {
  balances: MemberBalance[];
  members: Member[];
  currentUserId: UserId;
}) {
  const largest = Math.max(...balances.map((b) => Math.abs(b.balance)), 1);

  return (
    <section aria-labelledby="balances-title" className="rounded-[20px] border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="balances-title" className="font-display text-xl font-semibold">
          Balances
        </h2>
        <p className="text-sm text-muted">Left of the line owes money. Right of the line gets money back.</p>
      </div>

      <ul className="mt-6 space-y-5 sm:space-y-3">
        {balances.map(({ member, balance }) => {
          const isYou = member.id === currentUserId;
          const owed = balance > 0;
          const width = `${(Math.abs(balance) / largest) * 100}%`;
          const label =
            balance === 0 ? "Settled up" : `${owed ? "Gets back" : "Owes"} ${formatMoney(Math.abs(balance))}`;

          return (
            <li
              key={member.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[8.5rem_1fr_10rem]"
            >
              <span className="flex items-center gap-2.5">
                <Avatar member={member} members={members} size="sm" />
                <span className={isYou ? "font-semibold" : "font-medium"}>{isYou ? "You" : member.name}</span>
              </span>

              <span className={`text-right text-sm font-medium sm:order-last ${owed ? "text-owed" : balance < 0 ? "text-owes" : "text-muted"}`}>
                {label}
              </span>

              {/* The chart itself is decorative: the label above says the same thing in words. */}
              <span aria-hidden className="col-span-2 grid h-7 grid-cols-2 sm:col-span-1">
                <span className="flex justify-end border-r-2 border-ink">
                  {balance < 0 && (
                    <span
                      className="bar-grow my-1.5 rounded-l-full bg-owes"
                      style={{ width, transformOrigin: "right" }}
                    />
                  )}
                </span>
                <span className="flex">
                  {owed && (
                    <span
                      className="bar-grow my-1.5 rounded-r-full bg-owed"
                      style={{ width, transformOrigin: "left" }}
                    />
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
