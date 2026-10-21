/**
 * Splitly design tokens: the single source of truth for how both apps look.
 *
 * - Mobile picks `themes.light` or `themes.dark` with useColorScheme() and
 *   uses the values directly in its styles.
 * - Web injects `themeCss()` into the page, which defines the same colours as
 *   CSS variables for light and dark mode; Tailwind turns them into classes
 *   like `bg-canvas` and `text-owed`.
 *
 * Change a colour here and both apps update.
 */

export interface Palette {
  canvas: string; // page background
  surface: string; // cards and dialogs
  ink: string; // main text
  muted: string; // secondary text
  line: string; // borders and dividers
  owed: string; // "gets back" (positive balance)
  owedSoft: string;
  owes: string; // "owes" (negative balance)
  owesSoft: string;
  marigold: string; // primary actions, "you" highlight
  marigoldSoft: string;
  onMarigold: string; // text on marigold buttons
  panel: string; // the settle-up panel
  panelRaised: string; // rows inside the panel
  onPanel: string; // text on the panel
}

const light: Palette = {
  canvas: "#EEF1ED",
  surface: "#FFFFFF",
  ink: "#1A1C2E",
  muted: "#5D6273",
  line: "#DCE1DA",
  owed: "#0B8466",
  owedSoft: "#D5EEE5",
  owes: "#C9324F",
  owesSoft: "#F8DCE2",
  marigold: "#F4B63F",
  marigoldSoft: "#FCEFD2",
  onMarigold: "#1A1C2E",
  panel: "#1A1C2E",
  panelRaised: "#2A2D45",
  onPanel: "#EEF1ED",
};

const dark: Palette = {
  canvas: "#11131D",
  surface: "#1A1D2B",
  ink: "#E9EBF2",
  muted: "#9BA1B5",
  line: "#2B2F42",
  owed: "#3DCB9C",
  owedSoft: "#12352C",
  owes: "#FF7A93",
  owesSoft: "#3F1D27",
  marigold: "#F4B63F",
  marigoldSoft: "#3A2E14",
  onMarigold: "#1A1C2E",
  panel: "#252940",
  panelRaised: "#31364F",
  onPanel: "#E9EBF2",
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Bigger surfaces get bigger corners; small chips stay tight. */
export const radii = { sm: 6, md: 12, lg: 20, pill: 999 } as const;

export const fontSizes = { caption: 12, small: 13, body: 15, title: 20, headline: 28, display: 40 } as const;

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

/** Background / text pairs that pass WCAG AA contrast, in light and dark mode. */
const avatarPalette = [
  { background: "#DCE6FF", text: "#23366E" },
  { background: "#FFE1CC", text: "#7A3410" },
  { background: "#D9F0E3", text: "#145238" },
  { background: "#F3DDF5", text: "#5E1F66" },
  { background: "#FFF0B8", text: "#5C4A00" },
  { background: "#D6EEF5", text: "#11495A" },
] as const;

/**
 * Colour for the person at position `index` in a group's member list.
 * Using the position (not a hash of the id) means the first six people in a
 * group always get six different colours, and each keeps theirs on every screen.
 */
export function avatarColors(index: number): { background: string; text: string } {
  const safe = Number.isInteger(index) && index >= 0 ? index : 0;
  return avatarPalette[safe % avatarPalette.length]!;
}

/** "Mahi" -> "M", "Mahi Soni" -> "MS" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : "";
  return (first + last).toUpperCase();
}

// ---------------------------------------------------------------------------
// Expense categories (keys match EXPENSE_CATEGORIES in @splitly/core)
// ---------------------------------------------------------------------------

interface Tone {
  background: string;
  foreground: string;
}

export const categoryStyles: Record<string, { label: string; light: Tone; dark: Tone }> = {
  stay: { label: "Stay", light: { background: "#E3E7FB", foreground: "#33408C" }, dark: { background: "#262C52", foreground: "#B7C1FF" } },
  travel: { label: "Travel", light: { background: "#D8EEF3", foreground: "#17586A" }, dark: { background: "#173A44", foreground: "#9FDCEB" } },
  food: { label: "Food", light: { background: "#FCE5D6", foreground: "#8A3D12" }, dark: { background: "#47281A", foreground: "#FFC29E" } },
  groceries: { label: "Groceries", light: { background: "#DDF0DC", foreground: "#2D6127" }, dark: { background: "#1F3B1E", foreground: "#A9E0A4" } },
  fun: { label: "Fun", light: { background: "#F4E0F3", foreground: "#76286F" }, dark: { background: "#3E1F3C", foreground: "#F0B2EA" } },
  rent: { label: "Rent", light: { background: "#EFE6DA", foreground: "#5E4320" }, dark: { background: "#3A2E20", foreground: "#E6C99E" } },
  bills: { label: "Bills", light: { background: "#FFF1C7", foreground: "#6B5200" }, dark: { background: "#3D3412", foreground: "#F7DA7A" } },
  other: { label: "Other", light: { background: "#E9EAEE", foreground: "#454A5C" }, dark: { background: "#2A2D3B", foreground: "#C5C9D6" } },
};

// ---------------------------------------------------------------------------
// Web: CSS variables for light and dark mode
// ---------------------------------------------------------------------------

function declarations(palette: Palette, mode: ThemeName): string {
  const colorVars = Object.entries(palette).map(([name, value]) => `--splitly-${name}:${value};`);
  const categoryVars = Object.entries(categoryStyles).flatMap(([name, style]) => [
    `--splitly-cat-${name}-bg:${style[mode].background};`,
    `--splitly-cat-${name}-fg:${style[mode].foreground};`,
  ]);
  return [...colorVars, ...categoryVars, `color-scheme:${mode};`].join("");
}

/**
 * CSS that defines every colour as a variable. Light by default, dark when the
 * device prefers it, and `data-theme="light" | "dark"` on <html> overrides both.
 */
export function themeCss(): string {
  return [
    `:root{${declarations(light, "light")}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${declarations(dark, "dark")}}}`,
    `:root[data-theme="dark"]{${declarations(dark, "dark")}}`,
  ].join("\n");
}
