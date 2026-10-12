/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening entries land on the right day). */
export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today() {
  return toISODate(new Date());
}

export function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

/** First day of the month and first day of the next month, as YYYY-MM-DD. */
export function monthRange(year: number, month: number) {
  return { from: toISODate(new Date(year, month, 1)), to: toISODate(new Date(year, month + 1, 1)) };
}

export function formatMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** "Today", "Yesterday", or e.g. "Mon 6 Oct". */
export function formatDay(isoDate: string) {
  if (isoDate === today()) return 'Today';
  if (isoDate === yesterday()) return 'Yesterday';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
