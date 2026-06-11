import { identityFromIdToken, intuneAdapter, mergeUser } from './intuneAuth';
import { useAuthStore } from '@store/useAuthStore';
import { useCatalogStore } from '@store/useCatalogStore';
import { versionRegistry, setAccessTokenGetter, setUnauthorizedHandler } from '@api/index';
import { setApimTokenAcquirer } from '@api/apimClient';
import { setApiBaseUrl, setTokenGetter } from '@myek/api-client';
import { config } from '@/config';
import { profilePictureService } from '@services/profilePictureService';
import { graphProfileService } from '@services/graphProfileService';
import { userService } from '@services/userService';
import { stores, json } from '@utils/storage';
import { createLogger } from '@utils/logger';
import type { AuthSession, LoginResult, ProfilePicture } from '@/types';

const log = createLogger('Auth/Service');
const SESSION_KEY = 'session.v1';
// Bumped on every schema change to the persisted LoginResult:
//   v1 → v2 — biometric defaulted ON.
//   v2 → v3 — `apps` array shape change (platinumVouchers added, others
//             removed); `authBootstrap.json` became the source of truth.
//   v3 → v4 — `authBootstrap.json` removed entirely. `apps`,
//             `widgetLayout`, `apiVersions` are now synthesised from
//             `applicationsManifest.json` (the single source of truth for
//             the app catalogue). `permissions` moves to a hardcoded
//             baseline constant in `intuneAuth.ts`.
// Rather than mutate / merge the cached payload at hydrate time (a hack
// that hides the precedence model and risks granting access to apps the
// server hasn't entitled), we invalidate the cache. Next launch falls
// back to the login screen, the user signs in once, and the fresh
// bootstrap carries the new defaults.
const BOOTSTRAP_KEY = 'bootstrap.v4';
const PHOTO_KEY = 'photo.v1';

/**
 * Hydrate persisted auth state on app boot. Returns true if an active session
 * was restored, false otherwise.
 *
 * We persist *both* the session (tokens) and the bootstrap result (apps, widgets,
 * versions) so the UI can render a meaningful home screen offline.
 *
 * Token refresh — when the persisted token is already expired — is fired off
 * in the **background** rather than awaited, so the splash screen dismisses
 * the moment cache is restored. The 401 interceptor wired in `wireApiAuth`
 * still triggers an on-demand refresh for any API call that hits an expired
 * token before the background refresh lands.
 */
export async function hydrateAuth(): Promise<boolean> {
  const session = json.get<AuthSession>(stores.auth, SESSION_KEY);
  const bootstrap = json.get<LoginResult>(stores.auth, BOOTSTRAP_KEY);

  if (!session || !bootstrap) {
    log.debug('No persisted session');
    return false;
  }

  // Restore everything to memory before any API call goes out.
  versionRegistry.set(bootstrap.apiVersions);
  useAuthStore.getState().bootstrapFromCache(session, bootstrap);

  // Re-derive the displayed identity from the cached ID token so a stale cached
  // user (or one whose name never resolved) shows the logged-in user — no
  // re-sign-in required.
  const cachedUser = useAuthStore.getState().user;
  if (cachedUser) {
    useAuthStore.getState().setUser(mergeUser(cachedUser, identityFromIdToken(session.idToken)));
  }

  // Fetch the profile picture once per session — fire and forget, the
  // Avatar component falls back to its SVG silhouette while the call is
  // in flight or if it fails.
  void loadProfilePicture();
  // Same pattern for the user profile — refresh from the API in the
  // background so cached-session launches still get up-to-date fields.
  void refreshUserProfile();

  // Load the per-app MF catalog so federated widgets (e.g. leave) resolve from
  // the backend, not a hardcoded list. Best-effort: failure → in-host widgets.
  void useCatalogStore.getState().load();

  // If the persisted token is expired, kick off a background refresh.
  // We deliberately don't await it — splash dismisses on cached state,
  // and any in-flight request that hits a 401 will be retried by the
  // interceptor with a fresh token.
  if (Date.now() >= session.expiresAt) {
    log.info('Persisted session expired — refreshing in background');
    void backgroundRefresh(session.refreshToken);
  }

  return true;
}

/**
 * Off-critical-path token refresh. Best-effort: failures bounce the user
 * back to login, but only after splash has already handed off to the
 * navigator, so the user never sees a stalled red screen.
 */
async function backgroundRefresh(refreshToken: string): Promise<void> {
  try {
    const refreshed = await intuneAdapter.refresh(refreshToken);
    if (!refreshed) {
      log.warn('Background refresh failed; signing out');
      await signOut();
      return;
    }
    persistSession(refreshed);
    useAuthStore.getState().updateSession(refreshed);
    // Self-heal the catalog: the launch-time `load()` (hydrateAuth) fired with
    // the still-expired token and likely 401'd → empty catalog → every widget
    // rendered in-host. Now that we hold a fresh token, reload it. WidgetRenderer
    // subscribes to `widgetToService`, so a populated catalog flips each tile to
    // its federated remote — no manual re-login needed.
    void useCatalogStore.getState().load();
  } catch (e) {
    log.warn('Background refresh threw', e);
  }
}

/** Wire api-layer hooks once during app bootstrap. */
export function wireApiAuth(): void {
  setAccessTokenGetter(() => useAuthStore.getState().session?.accessToken ?? null);
  setUnauthorizedHandler(async () => {
    const session = useAuthStore.getState().session;
    if (!session) return null;
    const refreshed = await intuneAdapter.refresh(session.refreshToken);
    if (!refreshed) {
      await signOut();
      return null;
    }
    persistSession(refreshed);
    useAuthStore.getState().updateSession(refreshed);
    return refreshed.accessToken;
  });
  // Single-token model (mirrors enterprise-app): the BFF client uses the SAME
  // resource-scoped session token as apiClient, read synchronously from the
  // store. The previous per-call MSAL silent acquisition returned null under
  // the burst of parallel widget fetches at launch → requests went out with no
  // Authorization header → Kong 401 → widgets fell back to mocks. Refresh only
  // when the cached token is actually expired.
  setApimTokenAcquirer(acquireBffToken);
  // Cross-bundle client (@myek/api-client, ADR-0022): federated remotes fetch
  // their own data through globalThis-slot config the host publishes here —
  // same single token + BFF base as the host's own clients.
  setApiBaseUrl(config.apim.baseUrl);
  setTokenGetter(acquireBffToken);
}

/**
 * Single-token acquirer shared by the host's BFF client and the cross-bundle
 * @myek/api-client: the cached session token, refreshed only when actually
 * expired. Per-call silent MSAL acquisition is deliberately avoided — it
 * returned null under the parallel widget-fetch burst at launch (see the
 * wireApiAuth comment above).
 */
async function acquireBffToken(): Promise<string | null> {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    const refreshed = await intuneAdapter.refresh(session.refreshToken);
    if (refreshed) {
      persistSession(refreshed);
      useAuthStore.getState().updateSession(refreshed);
      return refreshed.accessToken;
    }
  }
  return session.accessToken;
}

export async function signIn(): Promise<LoginResult> {
  log.info('signIn requested');
  const result = await intuneAdapter.signIn();
  versionRegistry.set(result.apiVersions);
  persistSession(result.session);
  json.set(stores.auth, BOOTSTRAP_KEY, result);
  useAuthStore.getState().setLoginResult(result);
  // Photo fetch is the single source-of-truth load for every Avatar in
  // the app. Fire and forget — UI works without it.
  void loadProfilePicture();
  // Refresh the user profile from the live API in the background; the
  // initial render already has the bootstrap-bundled user data, this just
  // replaces it with fresh server-side fields (jobTitle, eligibilities, …).
  void refreshUserProfile();
  // Load the per-app MF catalog so federated widgets resolve (best-effort).
  void useCatalogStore.getState().load();
  return result;
}

/**
 * Pulls the latest user profile from the HR API and overwrites the cached
 * copy in `useAuthStore`. Fire-and-forget — failures fall back to the
 * already-rendered cached profile and are logged, not surfaced.
 */
async function refreshUserProfile(): Promise<void> {
  if (!useAuthStore.getState().user) return;
  try {
    // 1) Real profile fields from Microsoft Graph `/me` (jobTitle, department,
    //    location, name, email) so the signed-in user sees their OWN data, not
    //    the bundled demo persona. Returns a partial — real values win, and
    //    fields Graph doesn't carry are left untouched. null on failure.
    const graphProfile = await graphProfileService.fetch();
    if (graphProfile) {
      useAuthStore.getState().setUser(mergeUser(useAuthStore.getState().user!, graphProfile));
    }
    // 2) Emirates HR API for the EK-specific fields Graph can't supply (grade,
    //    eligibilities, joinedAt). Returns null on failure — never the demo
    //    persona — so it can't clobber the real identity from step 1.
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (employeeId) {
      const hr = await userService.fetch(employeeId);
      if (hr) useAuthStore.getState().setUser(mergeUser(useAuthStore.getState().user!, hr));
    }
    log.debug('User profile refreshed (Graph /me + HR)');
  } catch (e) {
    log.warn('Background user-profile refresh failed — real identity kept', e);
  }
}

/**
 * Stale-while-revalidate profile-picture loader.
 *
 *  1. Synchronously hydrates the photo from MMKV (`PHOTO_KEY`) so every
 *     Avatar in the tree renders the cached image from the very first
 *     frame after boot — no flash of silhouette.
 *  2. Kicks off a single background fetch per session to refresh the
 *     cache. Result writes back to both the store and MMKV; a failure
 *     leaves the cached version untouched.
 *
 * The session-scoped `photoRefreshInflight` guard ensures multiple
 * callers (signIn + hydrateAuth) don't both trigger network requests.
 * The function returns immediately — the network roundtrip is fully
 * background and never awaited by the caller.
 */
let photoRefreshInflight: Promise<void> | null = null;

export function loadProfilePicture(): void {
  // (1) Instant hydrate from disk if we don't already have one in memory.
  const existing = useAuthStore.getState().photo;
  if (!existing) {
    const cached = json.get<ProfilePicture>(stores.auth, PHOTO_KEY);
    if (cached) {
      useAuthStore.getState().setPhoto(cached);
    }
  }

  // (2) One background refresh per session — multiple callers coalesce.
  if (photoRefreshInflight) return;
  photoRefreshInflight = refreshProfilePictureInBackground();
}

async function refreshProfilePictureInBackground(): Promise<void> {
  try {
    const fresh = await profilePictureService.fetch();
    if (fresh.base64.length > 0) {
      useAuthStore.getState().setPhoto(fresh);
      json.set(stores.auth, PHOTO_KEY, fresh);
      log.debug('Profile picture refreshed in background');
    }
  } catch (e) {
    log.warn('Background profile-picture refresh failed', e);
  } finally {
    photoRefreshInflight = null;
  }
}

/**
 * Probe the auth adapter without triggering interactive sign-in. Useful as a
 * quick health check during app boot or from a debug screen to confirm that
 * MSAL is wired correctly (clientId, tenant, redirectUri reachable).
 */
export async function validateAuthConnection() {
  const result = await intuneAdapter.validate();
  if (result.ok) {
    log.info('Auth adapter validation OK', result);
  } else {
    log.error('Auth adapter validation FAILED', result);
  }
  return result;
}

export async function signOut(): Promise<void> {
  const token = useAuthStore.getState().session?.accessToken;
  log.info('signOut requested');
  if (token) await intuneAdapter.signOut(token);

  // Clear in-memory state
  useAuthStore.getState().clear();
  versionRegistry.clear();
  // Federation teardown: the next account must not inherit this account's
  // catalog maps, cached catalog, or MF remote registrations.
  useCatalogStore.getState().reset();

  // Clear persisted session + bootstrap (but keep prefs like theme + cache —
  // cache is wiped separately if compliance demands it)
  stores.auth.clearAll();
}

function persistSession(session: AuthSession) {
  json.set(stores.auth, SESSION_KEY, session);
}
