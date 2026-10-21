const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Groups are shown in India Standard Time (UTC+5:30, no daylight saving) so the
 * server and every browser put an expense on the same day. Without a fixed
 * timezone, a server running on UTC (like Vercel) and a browser in India
 * disagree about late-evening expenses, and React reports a hydration error.
 * Week 2 can store a timezone per group instead.
 */
export const GROUP_UTC_OFFSET_MINUTES = 330;

/**
 * "Thursday, 1 October"
 *
 * Built by hand instead of with Intl.DateTimeFormat, because Node (which
 * renders the page on the server) and browsers ship different locale data and
 * punctuate dates differently. Any difference makes React throw a hydration error.
 */
export function formatDay(iso: string, utcOffsetMinutes = GROUP_UTC_OFFSET_MINUTES): string {
  // Shift the moment by the offset, then read it with the UTC getters, so the
  // result never depends on the timezone of the machine running this code.
  const date = new Date(new Date(iso).getTime() + utcOffsetMinutes * 60_000);
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** Groups items by the day they happened on, keeping their order. */
export function groupByDay<T extends { createdAt: string }>(
  items: T[],
  utcOffsetMinutes = GROUP_UTC_OFFSET_MINUTES,
): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = formatDay(item.createdAt, utcOffsetMinutes);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

/** ["You", "Aarav", "Priya"] -> "You, Aarav and Priya" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
