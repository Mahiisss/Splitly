/** Class names shared by buttons and form fields, so every form looks the same. */

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export const button = {
  primary: `inline-flex h-11 items-center justify-center gap-2 rounded-full bg-marigold px-5 text-sm font-semibold text-on-marigold hover:brightness-95 disabled:opacity-50 ${focusRing}`,
  secondary: `inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/20 bg-surface px-5 text-sm font-semibold text-ink hover:border-ink/40 ${focusRing}`,
};

/** Field styles without a width, for small inline inputs that set their own. */
export const fieldBase =
  "h-11 rounded-xl border border-line bg-surface px-3 text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";

export const field = `${fieldBase} w-full`;

export const label = "text-sm font-medium text-ink";

/** A pill that sits next to a visually hidden radio/checkbox (`peer sr-only`). */
export const chip =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:border-ink/40 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marigold";
