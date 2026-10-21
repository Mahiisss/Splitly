import {
  BedDouble,
  Bike,
  HandCoins,
  House,
  PartyPopper,
  Receipt,
  ShoppingBasket,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ExpenseCategory } from "@splitly/core";
import { categoryStyles } from "@splitly/theme";

const icons: Record<ExpenseCategory, LucideIcon> = {
  stay: BedDouble,
  travel: Bike,
  food: UtensilsCrossed,
  groceries: ShoppingBasket,
  fun: PartyPopper,
  rent: House,
  bills: Zap,
  other: Receipt,
};

/** Just the icon, in the current text colour (used inside chips). */
export function CategoryGlyph({ category, size = 20 }: { category: ExpenseCategory; size?: number }) {
  const Icon = icons[category];
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}

function Tile({ background, color, children }: { background: string; color: string; children: ReactNode }) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11"
      style={{ backgroundColor: background, color }}
    >
      {children}
    </span>
  );
}

/** The icon on a coloured tile (used in the activity feed). Colours switch with dark mode. */
export function CategoryIcon({ category }: { category: ExpenseCategory }) {
  const Icon = icons[category];
  return (
    <Tile background={`var(--splitly-cat-${category}-bg)`} color={`var(--splitly-cat-${category}-fg)`}>
      <Icon size={20} strokeWidth={1.75} aria-label={categoryStyles[category]?.label ?? category} />
    </Tile>
  );
}

export function PaymentIcon() {
  return (
    <Tile background="var(--splitly-owedSoft)" color="var(--splitly-owed)">
      <HandCoins size={20} strokeWidth={1.75} aria-label="Payment" />
    </Tile>
  );
}
