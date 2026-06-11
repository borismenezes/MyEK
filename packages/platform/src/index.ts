/**
 * @myek/platform — cross-bundle bridge between the host and federated remotes.
 *
 * Host state (the signed-in user, the "open profile sheet" action) lives in host
 * stores the remotes can't import. Rather than fight MF singleton resolution for
 * React contexts, the host writes these onto namespaced `globalThis` slots and
 * remotes read them (the same pattern enterprise-app uses for its auth
 * token-getter, ADR-0022). The host keeps the slots fresh via `PlatformBridge`.
 */

export interface PlatformUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  organization?: string;
  /** Staff/employee ID — shown on the business card. */
  employeeId?: string;
  /** Work phone (Graph /me). Shown on the business card when present. */
  phone?: string;
  /** Optional avatar image URI/data-URI; remotes render initials when absent. */
  photoUri?: string;
}

const G = globalThis as unknown as Record<string, unknown>;
const USER_KEY = '__myek_platform_user__';
const USER_SUBS_KEY = '__myek_platform_user_subs__';
const OPEN_PROFILE_KEY = '__myek_platform_open_profile__';
const THEME_KEY = '__myek_platform_theme__';
const THEME_SUBS_KEY = '__myek_platform_theme_subs__';

function userSubs(): Set<() => void> {
  let subs = G[USER_SUBS_KEY] as Set<() => void> | undefined;
  if (!subs) {
    subs = new Set();
    G[USER_SUBS_KEY] = subs;
  }
  return subs;
}

export function setPlatformUser(user: PlatformUser | null): void {
  G[USER_KEY] = user ?? undefined;
  // Notify subscribers (remotes via usePlatformUser) so the card re-renders when
  // the host republishes — e.g. once Graph /me overrides employeeId with the real
  // value. Without this the federated card reads stale token-derived data.
  for (const cb of [...userSubs()]) {
    try {
      cb();
    } catch {
      // a single bad subscriber must not stop the rest
    }
  }
}
export function getPlatformUser(): PlatformUser | null {
  return (G[USER_KEY] as PlatformUser | undefined) ?? null;
}
/** Subscribe to platform-user changes. Returns an unsubscribe fn. */
export function subscribeUser(cb: () => void): () => void {
  const subs = userSubs();
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function setOpenProfile(fn: (() => void) | null): void {
  G[OPEN_PROFILE_KEY] = fn ?? undefined;
}
export function openProfile(): void {
  const fn = G[OPEN_PROFILE_KEY];
  if (typeof fn === 'function') (fn as () => void)();
}

// ── Copy-to-clipboard bridge ──────────────────────────────────────────────────
// The clipboard is a native module linked in the HOST. Rather than have every
// remote depend on it, the host publishes a copy action (with its own toast/
// feedback) onto globalThis and remotes call it — same pattern as openProfile.
const COPY_KEY = '__myek_platform_copy__';

export function setCopyToClipboard(fn: ((text: string, label?: string) => void) | null): void {
  G[COPY_KEY] = fn ?? undefined;
}
/** Copy `text` to the clipboard via the host (shows host-side feedback). */
export function copyToClipboard(text: string, label?: string): void {
  const fn = G[COPY_KEY];
  if (typeof fn === 'function') (fn as (t: string, l?: string) => void)(text, label);
}

// ── Active theme bridge ───────────────────────────────────────────────────────
// The host owns light/dark (ThemeProvider). Remotes can't import the host's
// React ThemeContext (separate bundle, not a shared singleton), so — exactly as
// with the user slot above — the host publishes its *active* Theme onto a
// globalThis slot and remotes read it via `@myek/ui`'s `useTheme()`. The shape is
// intentionally structural (host `Theme` assigns to it directly); `@myek/ui`
// casts it back to its own `Theme`. Subscribers (the `useTheme()` hooks) are
// notified synchronously on every change so federated UI re-renders on toggle.

/** Host theme published to remotes. Structurally matches the host's `Theme`. */
export interface PlatformTheme {
  mode: 'light' | 'dark';
  colors: Record<string, string>;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  font: {
    family: string;
    weight: Record<string, string>;
    size: Record<string, number>;
  };
}

function themeSubs(): Set<() => void> {
  let subs = G[THEME_SUBS_KEY] as Set<() => void> | undefined;
  if (!subs) {
    subs = new Set();
    G[THEME_SUBS_KEY] = subs;
  }
  return subs;
}

export function setActiveTheme(theme: PlatformTheme | null): void {
  G[THEME_KEY] = theme ?? undefined;
  // Notify on a copy — a subscriber that unsubscribes mid-iteration mustn't
  // mutate the set we're walking.
  for (const cb of [...themeSubs()]) {
    try {
      cb();
    } catch {
      // a single bad subscriber must not stop the rest from updating
    }
  }
}

export function getActiveTheme(): PlatformTheme | null {
  return (G[THEME_KEY] as PlatformTheme | undefined) ?? null;
}

/** Subscribe to active-theme changes. Returns an unsubscribe fn. */
export function subscribeTheme(cb: () => void): () => void {
  const subs = themeSubs();
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

// ── vCard 3.0 builder (shared, so every remote's contact QR is consistent) ────
export interface ContactCard {
  fullName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
}

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function splitName(fullName: string): { family: string; given: string } {
  const trimmed = fullName.trim();
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) return { family: '', given: trimmed };
  return { given: trimmed.slice(0, idx), family: trimmed.slice(idx + 1) };
}

/** vCard 3.0 (CRLF, RFC 2426) — what iOS Camera / Google Lens recognise for "Add to Contacts". */
export function buildVCard(input: ContactCard): string {
  const { family, given } = splitName(input.fullName);
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escape(family)};${escape(given)};;;`,
    `FN:${escape(input.fullName)}`,
    `ORG:${escape(input.organization)}`,
    `TITLE:${escape(input.jobTitle)}`,
    `TEL;TYPE=CELL:${input.phone.trim()}`,
    `EMAIL:${input.email.trim()}`,
    'END:VCARD',
  ].join('\r\n');
}
