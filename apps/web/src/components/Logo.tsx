/** A coin cut in two, the halves pulled apart: one bill, split. */
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M11.15 1.21A9.47 9.47 0 0 0 11.15 20.14Z" fill="var(--splitly-primary)" />
        <path d="M12.85 3.86A9.47 9.47 0 0 1 12.85 22.79Z" fill="var(--splitly-primary)" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">Splitly</span>
    </span>
  );
}
