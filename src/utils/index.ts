/**
 * Tiny utility helpers. Kept minimal — anything cross-cutting and stateful
 * belongs in a service or hook, not here.
 */

/** Format an ISO timestamp as "Mon, 14 May · 16:30" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format epoch ms as "2 minutes ago" / "yesterday" / "May 1" */
export function timeAgo(ms: number): string {
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(ms).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

/** Format minutes (e.g. 372) as "6h 12m" */
export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format currency with thousand separators */
export function formatCurrency(amount: number, currency = 'AED'): string {
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

/** Initials from a full name, max 2 letters */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Simple immutable array reorder */
export function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Sleep helper, used in retry/backoff */
export const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

/** Exponential backoff with jitter (returns a delay in ms for attempt N, 0-indexed) */
export function backoff(attempt: number, baseMs = 300, capMs = 5000): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(exp * (0.5 + Math.random() * 0.5));
}
