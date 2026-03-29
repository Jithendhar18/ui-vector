/**
 * Shared date/time formatting utilities.
 */

/**
 * Formats a date string as a human-readable relative time (e.g. "5m ago", "2h ago", "3d ago").
 * Returns `fallback` when input is null/undefined.
 */
export function relativeTime(
  date: string | null | undefined,
  fallback = "\u2014"
): string {
  if (!date) return fallback;

  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Groups an array of items by date bucket: Today, Yesterday, Previous 7 Days, Older.
 * `getDate` extracts the date string from each item.
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string | undefined
): Record<string, T[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 7 * 86_400_000;

  const groups: Record<string, T[]> = {};

  for (const item of items) {
    const raw = getDate(item);
    const ts = raw ? new Date(raw).getTime() : 0;

    let bucket: string;
    if (ts >= todayStart) bucket = "Today";
    else if (ts >= yesterdayStart) bucket = "Yesterday";
    else if (ts >= weekStart) bucket = "Previous 7 Days";
    else bucket = "Older";

    (groups[bucket] ??= []).push(item);
  }

  return groups;
}
