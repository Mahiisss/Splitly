import { Pencil, Trash2 } from "lucide-react";
import { expenseImpact, formatMoney, groupByDay, type ActivityItem, type Expense, type Member, type UserId } from "@splitly/core";
import { CategoryIcon, PaymentIcon } from "./CategoryIcon";

const iconButton =
  "flex size-9 items-center justify-center rounded-full text-muted/70 hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-ink";

export function ActivityFeed({
  activity,
  members,
  currentUserId,
  onDelete,
  onEdit,
  onAddExpense,
  className = "",
}: {
  activity: ActivityItem[];
  members: Member[];
  currentUserId: UserId;
  onDelete: (item: ActivityItem) => void;
  onEdit: (expense: Expense) => void;
  onAddExpense: () => void;
  className?: string;
}) {
  const name = (id: UserId) => (id === currentUserId ? "You" : (members.find((m) => m.id === id)?.name ?? id));

  return (
    <section aria-labelledby="activity-title" className={`rounded-[20px] border border-line bg-surface p-5 sm:p-7 ${className}`}>
      <h2 id="activity-title" className="font-display text-xl font-semibold">
        Activity
      </h2>

      {activity.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line px-6 py-10 text-center">
          <p className="font-medium">No expenses yet.</p>
          <p className="mt-1 text-sm text-muted">Add the first one and Splitly works out who owes what.</p>
          <button
            type="button"
            onClick={onAddExpense}
            className="mt-4 text-sm font-semibold text-ink underline underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Add an expense
          </button>
        </div>
      )}

      {groupByDay(activity).map(({ day, items }) => (
        <div key={day} className="mt-6">
          <h3 className="text-sm font-medium text-muted">{day}</h3>
          <ul className="mt-2 divide-y divide-line">
            {items.map((item) => {
              const title =
                item.kind === "expense"
                  ? item.expense.description
                  : `${name(item.settlement.from)} paid ${name(item.settlement.to).replace(/^You$/, "you")}`;
              return (
                <li key={item.id} className="flex items-center gap-3 py-3.5 sm:gap-4">
                  {item.kind === "expense" ? (
                    <ExpenseRow item={item} name={name} currentUserId={currentUserId} />
                  ) : (
                    <>
                      <PaymentIcon />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{title}</p>
                        <p className="text-sm text-muted">Recorded payment</p>
                        {/* On phones the amount sits here instead of in its own column. */}
                        <p className="text-sm font-medium text-owed sm:hidden">{formatMoney(item.settlement.amount)}</p>
                      </div>
                      <p className="hidden font-medium text-owed sm:block">{formatMoney(item.settlement.amount)}</p>
                    </>
                  )}
                  <div className="-mr-2 flex shrink-0">
                  {item.kind === "expense" && (
                    <button
                      type="button"
                      onClick={() => onEdit(item.expense)}
                      aria-label={`Edit ${title}`}
                      title="Edit"
                      className={iconButton}
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label={`Delete ${title}`}
                    title="Delete"
                    className={`${iconButton} hover:bg-owes-soft hover:text-owes`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function ExpenseRow({
  item,
  name,
  currentUserId,
}: {
  item: Extract<ActivityItem, { kind: "expense" }>;
  name: (id: UserId) => string;
  currentUserId: UserId;
}) {
  const { expense } = item;
  const impact = expenseImpact(expense, currentUserId);

  const impactText =
    impact.kind === "none" ? "Not involved" : `${impact.kind === "lent" ? "You lent" : "You borrowed"} ${formatMoney(impact.amount)}`;
  const impactColor = impact.kind === "lent" ? "text-owed" : impact.kind === "borrowed" ? "text-owes" : "text-muted";

  return (
    <>
      <CategoryIcon category={expense.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{expense.description}</p>
        <p className="text-sm text-muted">
          {name(expense.paidBy)} paid {formatMoney(expense.amount)}
        </p>
        {/* On phones "you lent / borrowed" sits under the name instead of in its own column. */}
        <p className={`text-sm font-medium sm:hidden ${impactColor}`}>{impactText}</p>
      </div>
      <div className="hidden text-right sm:block">
        {impact.kind === "none" ? (
          <p className="text-sm text-muted">Not involved</p>
        ) : (
          <>
            <p className="text-xs text-muted">{impact.kind === "lent" ? "You lent" : "You borrowed"}</p>
            <p className={`font-medium ${impact.kind === "lent" ? "text-owed" : "text-owes"}`}>
              {formatMoney(impact.amount)}
            </p>
          </>
        )}
      </div>
    </>
  );
}
