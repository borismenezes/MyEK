import { Alert } from 'react-native';
import { intuneAdapter } from '@auth/intuneAuth';
import { createLogger } from '@utils/logger';
import type { ProfilePicture } from '@/types';

const log = createLogger('Service/ProfilePicture');

// No-photo sentinel. When no real photo is available we return this instead of
// a shared stock headshot, so every Avatar falls back to the user's initials
// monogram (the professional, per-user default).
const EMPTY_PHOTO: ProfilePicture = { base64: '', mimeType: 'image/png' };

// Microsoft Graph — the signed-in user's own profile photo. `User.Read` (the
// app's sign-in scope) already covers `/me/photo`. `/$value` returns the raw
// image bytes; a 404 means the user simply hasn't set a photo in Entra/M365.
const GRAPH_PHOTO_URL = 'https://graph.microsoft.com/v1.0/me/photo/$value';
const GRAPH_SCOPES = ['https://graph.microsoft.com/User.Read'];

/**
 * Fetches the signed-in user's profile photo from Microsoft Graph as base64.
 *
 * Auth is direct-to-Graph: the session bearer is the ID token (aud = this app,
 * for the BFF/gateway), which Graph would reject — so we acquire a *separate*,
 * Graph-audienced access token silently via MSAL (`acquireTokenForScopes`,
 * cached from the interactive sign-in, no UI). The image bytes are then base64-
 * encoded into the `ProfilePicture` shape `<Avatar>` renders directly.
 *
 * Always degrades to `EMPTY_PHOTO` (→ initials monogram) on any failure: no
 * cached account, silent acquisition needing interaction, the user having no
 * photo (404), or a transport error. The UI never blanks and no user wears
 * another person's face.
 *
 * Called **exactly once per session** by `authService.signIn` /
 * `authService.hydrateAuth`, which stash the result on the auth store; every
 * Avatar reads from there. No widget should call this service directly.
 */
async function fetchProfilePicture(): Promise<ProfilePicture> {
  const token = await intuneAdapter.acquireTokenForScopes(GRAPH_SCOPES);
  if (!token) {
    reportError('No Graph token', {
      reason: 'acquireTokenForScopes returned null — no cached account, or silent acquisition needs interaction',
    });
    return EMPTY_PHOTO;
  }
  try {
    const res = await fetch(GRAPH_PHOTO_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'image/*' },
    });
    if (res.status === 404) {
      // ImageNotFound — the account simply has no Exchange-stored photo. An
      // expected empty state (→ real-user initials), NOT an error: don't surface.
      log.debug('Graph /me/photo 404 (no photo for this account) — Avatar shows initials');
      return EMPTY_PHOTO;
    }
    if (!res.ok) {
      // A real failure (auth/transport/Graph), distinct from "no photo". Decode
      // the token so the report shows whether the audience/scopes are wrong.
      const body = await res.text().catch(() => '<no body>');
      const claims = decodeJwtClaims(token);
      reportError(`Graph /me/photo ${res.status}`, {
        status: res.status,
        aud: claims.aud,
        scp: claims.scp,
        appid: claims.appid ?? claims.azp,
        body: body.slice(0, 400),
      });
      return EMPTY_PHOTO;
    }
    const parsed = parseDataUri(await blobToDataUri(await res.blob()));
    if (!parsed) {
      reportError('Graph photo: base64 conversion failed', { ct: res.headers.get('content-type') });
      return EMPTY_PHOTO;
    }
    log.debug('Graph profile photo loaded', { mime: parsed.mimeType, bytes: parsed.base64.length });
    return parsed;
  } catch (e) {
    reportError('Graph photo fetch threw', { error: e instanceof Error ? e.message : String(e) });
    return EMPTY_PHOTO;
  }
}

/**
 * Surface a GENUINE photo-fetch failure (token / transport / Graph error) —
 * distinct from the expected no-photo 404. Always logged; a DEV-ONLY Alert makes
 * it visible despite release stripping console, so a real regression isn't masked
 * by the silent initials fallback. Demos/release see nothing on-screen.
 */
function reportError(title: string, info: Record<string, unknown>): void {
  log.warn(`[photo] ${title}`, info);
  if (!__DEV__) return;
  try {
    Alert.alert(`Photo: ${title}`, JSON.stringify(info, null, 2));
  } catch {
    /* Alert unavailable in some contexts — the log line above still records it. */
  }
}

/** Decode a JWT payload for diagnostics (no signature check). */
function decodeJwtClaims(jwt: string): Record<string, unknown> {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return {};
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return JSON.parse(
      decodeURIComponent(
        atob(b64 + pad)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      ),
    ) as Record<string, unknown>;
  } catch {
    return { _note: 'token is not a decodable JWT (opaque/encrypted)' };
  }
}

/** Read a Blob into a `data:<mime>;base64,<bytes>` URI (RN FileReader). */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/** Split a base64 `data:` URI into the ProfilePicture shape (mime + bytes). */
function parseDataUri(uri: string): ProfilePicture | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(uri);
  if (!m || !m[2]) return null;
  return { mimeType: m[1], base64: m[2] };
}

export const profilePictureService = {
  fetch: fetchProfilePicture,
};
