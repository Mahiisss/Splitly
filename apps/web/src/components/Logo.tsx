/** Two overlapping coins: one bill, split. */
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="var(--splitly-ink)" />
        <circle cx="18" cy="10" r="9" fill="var(--splitly-marigold)" fillOpacity={0.92} />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">Splitly</span>
    </span>
  );
}
