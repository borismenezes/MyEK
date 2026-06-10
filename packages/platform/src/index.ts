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
  /** Optional avatar image URI/data-URI; remotes render initials when absent. */
  photoUri?: string;
}

const G = globalThis as unknown as Record<string, unknown>;
const USER_KEY = '__myek_platform_user__';
const OPEN_PROFILE_KEY = '__myek_platform_open_profile__';

export function setPlatformUser(user: PlatformUser | null): void {
  G[USER_KEY] = user ?? undefined;
}
export function getPlatformUser(): PlatformUser | null {
  return (G[USER_KEY] as PlatformUser | undefined) ?? null;
}

export function setOpenProfile(fn: (() => void) | null): void {
  G[OPEN_PROFILE_KEY] = fn ?? undefined;
}
export function openProfile(): void {
  const fn = G[OPEN_PROFILE_KEY];
  if (typeof fn === 'function') (fn as () => void)();
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
