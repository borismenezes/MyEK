import { intuneAdapter } from '@auth/intuneAuth';
import { createLogger } from '@utils/logger';
import type { User } from '@/types';

const log = createLogger('Service/GraphProfile');

// Microsoft Graph `/me` — the signed-in user's real directory profile. `$select`
// is limited to the fields we actually map, both to shrink the payload and to
// avoid pulling attributes we don't need. `User.Read` (the sign-in scope) covers
// it. `employeeId` is only populated when the org syncs it to Entra; absent is
// fine (we just don't override).
const GRAPH_ME_URL =
  'https://graph.microsoft.com/v1.0/me?$select=givenName,surname,jobTitle,department,officeLocation,mail,userPrincipalName,employeeId';
const GRAPH_SCOPES = ['https://graph.microsoft.com/User.Read'];

interface GraphMe {
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  mail?: string;
  userPrincipalName?: string;
  employeeId?: string;
}

/**
 * Fetches the signed-in user's REAL profile fields from Microsoft Graph `/me`,
 * mapped to a `Partial<User>` (only the keys Graph actually returned).
 *
 * Returned as a partial so the caller merges it **over** the existing user —
 * real values win, and anything Graph doesn't carry (grade, joinedAt,
 * eligibilities — Emirates-specific) is left untouched rather than blanked.
 *
 * Returns `null` (never a demo persona) on any failure, so a failed refresh can
 * never clobber the already-correct real identity with bundled static data.
 */
async function fetchGraphProfile(): Promise<Partial<User> | null> {
  const token = await intuneAdapter.acquireTokenForScopes(GRAPH_SCOPES);
  if (!token) {
    log.warn('No Graph token — skipping /me profile refresh (real identity kept)');
    return null;
  }
  try {
    const res = await fetch(GRAPH_ME_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      log.warn(`Graph /me failed (${res.status}) — keeping current identity`);
      return null;
    }
    const me = (await res.json()) as GraphMe;
    const out: Partial<User> = {};
    if (me.givenName) out.firstName = me.givenName;
    if (me.surname) out.lastName = me.surname;
    if (me.jobTitle) out.jobTitle = me.jobTitle;
    if (me.department) out.department = me.department;
    if (me.officeLocation) out.location = me.officeLocation;
    if (me.mail || me.userPrincipalName) out.email = (me.mail ?? me.userPrincipalName)!;
    if (me.employeeId) out.employeeId = me.employeeId;
    return out;
  } catch (e) {
    log.warn('Graph /me threw — keeping current identity', e);
    return null;
  }
}

export const graphProfileService = {
  fetch: fetchGraphProfile,
};
