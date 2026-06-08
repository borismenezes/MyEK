import { Platform } from 'react-native';
import PublicClientApplication, {
  type MSALConfiguration,
  type MSALInteractiveParams,
  type MSALResult,
  type MSALSilentParams,
} from 'react-native-msal';
import { apiClient, endpoints } from '@api/index';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import { DEFAULT_FLAGS } from '@utils/featureFlags';
import manifestDefault from '../services/defaults/applicationsManifest.json';
import userDefault from '../services/defaults/user.json';
import { DEFAULT_LAYOUT_ORDER, resolveWidgetSize } from '../widgets/WidgetRegistry';
import { resolveIconName } from '@components/Icon';
import type {
  ApiVersion,
  AppConfig,
  AppManifestEntry,
  AuthSession,
  LoginResult,
  Permission,
  User,
  WidgetConfig,
} from '@/types';

/**
 * Baseline permission set granted to every signed-in employee. Replace with
 * a per-user permission claim once the backend exposes one.
 */
const BASELINE_PERMISSIONS: Permission[] = [
  'home.read',
  'profile.read',
  'profile.write',
  'leave.read',
  'leave.write',
  'payslip.read',
  'attendance.read',
  'card.read',
  'card.share',
];

const log = createLogger('Auth/Intune');

/**
 * Microsoft Entra ID / MSAL wrapper.
 *
 * Two implementations:
 *  - `MsalIntuneAdapter` — real interactive sign-in via `react-native-msal`.
 *    Native config: iOS Info.plist URL schemes + Android msal_config.json.
 *  - `MockIntuneAdapter` — offline fallback for development.
 *
 * Selection happens at module load via the `useMockAuth` flag below.
 */
export interface IntuneAdapter {
  /** Open the system auth UI / MSAL flow. Returns a LoginResult on success. */
  signIn(): Promise<LoginResult>;
  /** Exchange a refresh token for a new session, or null if rejected. */
  refresh(refreshToken: string): Promise<AuthSession | null>;
  /** Best-effort sign out — revokes server-side tokens too. */
  signOut(accessToken: string): Promise<void>;
  /** Whether the device is enrolled and Intune compliant. Stub returns true. */
  isCompliant(): Promise<boolean>;
  /**
   * Validate that the adapter is reachable / configured correctly without
   * triggering an interactive sign-in. Returns a structured result so the
   * caller can surface the failure mode.
   */
  validate(): Promise<ValidationResult>;
  /**
   * Acquire an access token for an arbitrary scope set (silent, no UI).
   * Used by API services to get a token whose `aud` matches their resource —
   * separate from the sign-in token. Returns null if no cached account exists
   * or the silent flow requires interaction.
   */
  acquireTokenForScopes(scopes: string[]): Promise<string | null>;
}

export type ValidationResult =
  | { ok: true; mode: 'msal' | 'mock'; details?: Record<string, unknown> }
  | { ok: false; mode: 'msal' | 'mock'; error: string; details?: Record<string, unknown> };

/* ────────────────────────────────────────────────────────────
 * Real MSAL adapter
 * ──────────────────────────────────────────────────────────── */

class MsalIntuneAdapter implements IntuneAdapter {
  private pca: PublicClientApplication;
  private initPromise: Promise<unknown> | null = null;
  private accountIdentifier: string | null = null;

  constructor() {
    const msalConfig: MSALConfiguration = {
      auth: {
        clientId: config.auth.clientId,
        authority: config.auth.authority,
        redirectUri: config.auth.redirectUri,
      },
    };
    this.pca = new PublicClientApplication(msalConfig);
  }

  private ensureInit(): Promise<unknown> {
    if (!this.initPromise) {
      this.initPromise = this.pca.init().catch((err: unknown): never => {
        // Reset so a future call can retry.
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  async signIn(): Promise<LoginResult> {
    await this.ensureInit();
    log.info('MSAL interactive sign-in starting', {
      tenantId: config.auth.tenantId,
      clientId: config.auth.clientId,
    });

    const params: MSALInteractiveParams = { scopes: config.auth.scope };
    const result = await this.pca.acquireToken(params);
    if (!result) {
      throw new Error('MSAL acquireToken returned no result (sign-in cancelled?)');
    }
    this.accountIdentifier = result.account.identifier;

    const session = toSession(result);

    // Boot from the MyEK BFF (`/v1/myek/bootstrap`): apps, widgets, permissions
    // assembled from the user's entitlements + JWT identity. The auth store
    // isn't populated yet, so the token is passed explicitly. With edge-
    // terminated auth there's no token exchange — the MSAL session is the real
    // thing. On any failure we synthesise a LoginResult from bundled defaults
    // so the app still hydrates offline.
    try {
      const bootstrap = await fetchMyekBootstrap(session.accessToken);
      return myekBootstrapToLoginResult(bootstrap, session);
    } catch (e) {
      log.warn('MyEK BFF /v1/myek/bootstrap unreachable — using bundled fallback LoginResult', e);
      return makeBootstrapFromMsal(result, session);
    }
  }

  async refresh(_refreshToken: string): Promise<AuthSession | null> {
    await this.ensureInit();
    try {
      const accounts = await this.pca.getAccounts();
      const account =
        accounts.find(a => a.identifier === this.accountIdentifier) ?? accounts[0];
      if (!account) {
        log.warn('No MSAL account available for silent refresh');
        return null;
      }
      const params: MSALSilentParams = { account, scopes: config.auth.scope };
      const result = await this.pca.acquireTokenSilent(params);
      return result ? toSession(result) : null;
    } catch (e) {
      log.warn('MSAL silent refresh failed', e);
      return null;
    }
  }

  async signOut(_accessToken: string): Promise<void> {
    await this.ensureInit();
    try {
      const accounts = await this.pca.getAccounts();
      const account =
        accounts.find(a => a.identifier === this.accountIdentifier) ?? accounts[0];
      if (account) {
        await this.pca.removeAccount(account);
      }
      this.accountIdentifier = null;
    } catch (e) {
      log.warn('MSAL signOut failed (ignored)', e);
    }
  }

  async isCompliant(): Promise<boolean> {
    // TODO: integrate Intune MAM SDK when available.
    return true;
  }

  async acquireTokenForScopes(scopes: string[]): Promise<string | null> {
    if (scopes.length === 0) return null;
    await this.ensureInit();
    try {
      const accounts = await this.pca.getAccounts();
      const account =
        accounts.find(a => a.identifier === this.accountIdentifier) ?? accounts[0];
      if (!account) {
        log.warn('acquireTokenForScopes: no MSAL account available');
        return null;
      }
      const result = await this.pca.acquireTokenSilent({ account, scopes });
      return result?.accessToken ?? null;
    } catch (e) {
      log.warn('acquireTokenForScopes failed', { scopes, error: e });
      return null;
    }
  }

  async validate(): Promise<ValidationResult> {
    try {
      await this.ensureInit();
      const accounts = await this.pca.getAccounts();
      return {
        ok: true,
        mode: 'msal',
        details: {
          platform: Platform.OS,
          tenantId: config.auth.tenantId,
          clientId: config.auth.clientId,
          redirectUri: config.auth.redirectUri,
          authority: config.auth.authority,
          scopes: config.auth.scope,
          cachedAccounts: accounts.length,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        mode: 'msal',
        error: message,
        details: {
          platform: Platform.OS,
          tenantId: config.auth.tenantId,
          clientId: config.auth.clientId,
          redirectUri: config.auth.redirectUri,
        },
      };
    }
  }
}

function toSession(result: MSALResult): AuthSession {
  // MSAL emits `expiresOn` as a Unix epoch in seconds on iOS and milliseconds
  // on Android — normalise to ms.
  const expiresAt = result.expiresOn < 1e12 ? result.expiresOn * 1000 : result.expiresOn;
  return {
    // The bearer sent to the backend is the OIDC ID token: this app reg is both
    // the client and the API audience (aud = client id = our API), so the ID
    // token validates at the gateway with no custom API scope. The access token
    // MSAL returns for the built-in scopes is audienced to Graph, not our API,
    // so it must NOT be used as the bearer.
    accessToken: result.idToken ?? result.accessToken,
    refreshToken: '', // MSAL manages refresh internally; not exposed to JS
    idToken: result.idToken,
    expiresAt,
    scope: result.scopes ?? config.auth.scope,
  };
}

/* ────────────────────────────────────────────────────────────
 * MyEK BFF bootstrap
 * ──────────────────────────────────────────────────────────── */

/** Raw `/v1/myek/bootstrap` payload — the frontend `LoginResult` minus `session`. */
export interface MyekBootstrapResult {
  user: User;
  permissions: string[];
  apps: AppConfig[];
  widgetLayout: WidgetConfig[];
  apiVersions: Record<string, ApiVersion>;
  featureFlags: Record<string, boolean>;
}

/**
 * Fetch the BFF bootstrap with an explicit bearer — called during sign-in
 * before the auth store (and therefore the api-client token getter) is
 * populated, so `skipAuth` + a manual Authorization header are required.
 */
async function fetchMyekBootstrap(accessToken: string): Promise<MyekBootstrapResult> {
  return apiClient.get<MyekBootstrapResult>(endpoints.home.bootstrap, {
    skipAuth: true,
    headers: { Authorization: `Bearer ${accessToken}` },
    retries: 1,
  });
}

/**
 * Project the BFF bootstrap onto the frontend `LoginResult`. Real identity
 * (id, employeeId, email, name) comes from the JWT-derived `user`; HR-heavy
 * fields the BFF doesn't yet supply (jobTitle, department, …) keep the bundled
 * demo values until `userService` (or a richer bootstrap) fills them. Exported
 * so warm refreshes (`homeService`) reuse the exact same projection.
 */
export function myekBootstrapToLoginResult(
  raw: MyekBootstrapResult,
  session: AuthSession,
): LoginResult {
  return {
    user: mergeUser(userDefault as User, raw.user),
    session,
    permissions: (raw.permissions?.length ? raw.permissions : BASELINE_PERMISSIONS) as Permission[],
    apps: raw.apps ?? [],
    widgetLayout: sortWidgetLayout(raw.widgetLayout ?? []),
    apiVersions: raw.apiVersions ?? {},
    // Empty/partial flags from the BFF must not disable shipped features.
    featureFlags: { ...DEFAULT_FLAGS, ...(raw.featureFlags ?? {}) },
  };
}

/** Overlay `over` onto `base`, keeping `base` wherever `over` is empty/missing. */
function mergeUser(base: User, over: Partial<User> | undefined): User {
  const out: User = { ...base };
  if (!over) return out;
  (Object.keys(over) as (keyof User)[]).forEach(key => {
    const value = over[key];
    if (value !== undefined && value !== null && value !== '') {
      (out as unknown as Record<string, unknown>)[key] = value;
    }
  });
  return out;
}

/** Sort a widget layout by the canonical home-grid order (unknown ids tail). */
function sortWidgetLayout(configs: WidgetConfig[]): WidgetConfig[] {
  const rank = new Map<string, number>(DEFAULT_LAYOUT_ORDER.map((id, i) => [id, i]));
  const tail = DEFAULT_LAYOUT_ORDER.length;
  return [...configs].sort((a, b) => (rank.get(a.widgetId) ?? tail) - (rank.get(b.widgetId) ?? tail));
}

/**
 * Synthesise the bootstrap payload after a successful MSAL sign-in.
 *
 * Until the HR backend is wired up, the displayed profile (name, jobTitle,
 * department, employeeId, eligibilities, etc.) comes from the bundled
 * `defaults/user.json` so the home screen reads as a coherent demo persona.
 * The MSAL session (access/id tokens) is still the real thing — it just
 * isn't used to populate profile fields. Replace this with a real call to
 * `endpoints.auth.login` once the backend is in place.
 *
 * Note: `_result` is intentionally unused; kept on the signature so the
 * caller's contract is stable when this is swapped out.
 */
function makeBootstrapFromMsal(_result: MSALResult, session: AuthSession): LoginResult {
  return { ...makeFallbackLoginResult(), session };
}

/* ────────────────────────────────────────────────────────────
 * Mock adapter (kept for offline dev / Jest)
 * ──────────────────────────────────────────────────────────── */

class MockIntuneAdapter implements IntuneAdapter {
  async signIn(): Promise<LoginResult> {
    log.info('Mock Intune sign-in starting', { tenantId: config.auth.tenantId });
    try {
      return await apiClient.post<LoginResult>(
        endpoints.auth.login,
        { grant: 'mock-intune', clientId: config.auth.clientId },
        { skipAuth: true },
      );
    } catch (e) {
      log.warn('Mock backend unreachable — using local fallback LoginResult', e);
      return makeFallbackLoginResult();
    }
  }

  async refresh(refreshToken: string): Promise<AuthSession | null> {
    try {
      return await apiClient.post<AuthSession>(
        endpoints.auth.refresh,
        { refreshToken },
        { skipAuth: true, retries: 0 },
      );
    } catch (e) {
      log.warn('Refresh token rejected', e);
      return null;
    }
  }

  async signOut(accessToken: string): Promise<void> {
    try {
      await apiClient.post(endpoints.auth.logout, { accessToken }, { retries: 0 });
    } catch (e) {
      log.warn('Server sign-out failed (ignored)', e);
    }
  }

  async isCompliant(): Promise<boolean> {
    return true;
  }

  async acquireTokenForScopes(_scopes: string[]): Promise<string | null> {
    // Mock mode — return a deterministic stub so APIM-backed services can
    // run end-to-end against fakes without touching MSAL.
    return 'mock-api-token';
  }

  async validate(): Promise<ValidationResult> {
    return { ok: true, mode: 'mock' };
  }
}

/**
 * Synthesises a LoginResult from bundled fallback data — no hardcoded
 * values live in this function. Sources, in order:
 *
 *   - `user`         ← `services/defaults/user.json`.
 *   - `permissions`  ← `BASELINE_PERMISSIONS` constant above.
 *   - `apps`, `widgetLayout`, `apiVersions`
 *                    ← derived from `services/defaults/applicationsManifest.json`,
 *                       the single source of truth for the app catalogue.
 *   - `featureFlags` ← `DEFAULT_FLAGS` from `@utils/featureFlags`.
 *   - `session`      ← generated at call time (random mock tokens, 1-hour
 *                       expiry). Tokens never belong in a checked-in JSON.
 */
function makeFallbackLoginResult(): LoginResult {
  const session: AuthSession = {
    accessToken: 'mock-access-' + Math.random().toString(36).slice(2),
    refreshToken: 'mock-refresh-' + Math.random().toString(36).slice(2),
    expiresAt: Date.now() + 60 * 60 * 1000,
    idToken: 'mock-id-token',
    scope: ['openid', 'profile', 'offline_access'],
  };

  const manifest = manifestDefault as AppManifestEntry[];

  return {
    user: userDefault as User,
    session,
    permissions: BASELINE_PERMISSIONS,
    apps: appsFromManifest(manifest),
    widgetLayout: widgetLayoutFromManifest(manifest),
    apiVersions: apiVersionsFromManifest(manifest),
    featureFlags: DEFAULT_FLAGS,
  };
}

/* ────────────────────────────────────────────────────────────
 * Manifest → LoginResult projection helpers
 * ──────────────────────────────────────────────────────────── */

function appsFromManifest(entries: AppManifestEntry[]): AppConfig[] {
  return entries
    .filter(e => e.enabled && e.showInServices)
    .map(e => ({
      appId: e.appName,
      name: e.applicationName,
      icon: resolveIconName(e.icon, e.appName),
      enabled: e.enabled,
      apiVersion: (e.apiVersion ?? 'v1') as ApiVersion,
      widgets: [],
    }));
}

function widgetLayoutFromManifest(entries: AppManifestEntry[]): WidgetConfig[] {
  const configs: WidgetConfig[] = entries
    .filter(e => e.enabled && e.showOnHome)
    .map(e => ({
      widgetId: e.widgetName,
      apiVersion: (e.apiVersion ?? 'v1') as ApiVersion,
      endpoint: e.endpoint ?? '',
      layout: { size: resolveWidgetSize(e.defaultSize, e.widgetName) },
    }));
  // Sort by the canonical home-grid order. Manifest entries (live or
  // bundled) can ship in any sequence; the home grid still renders in the
  // order defined by `DEFAULT_LAYOUT_ORDER` so subsequent app launches see
  // the same arrangement until the user re-arranges it themselves.
  const rank = new Map<string, number>(DEFAULT_LAYOUT_ORDER.map((id, i) => [id, i]));
  const tail = DEFAULT_LAYOUT_ORDER.length;
  return configs.sort((a, b) => (rank.get(a.widgetId) ?? tail) - (rank.get(b.widgetId) ?? tail));
}

function apiVersionsFromManifest(entries: AppManifestEntry[]): Record<string, ApiVersion> {
  const out: Record<string, ApiVersion> = {};
  for (const e of entries) {
    if (e.apiVersion) out[e.appName] = e.apiVersion;
  }
  return out;
}

/* ────────────────────────────────────────────────────────────
 * Adapter selection
 *
 * Real MSAL is on by default. Set INTUNE_CLIENT_ID to all-zeros (the dummy
 * placeholder in `.env.example`) to fall back to the mock — useful for
 * offline development and the Jest environment where native modules don't
 * exist.
 * ──────────────────────────────────────────────────────────── */

const useMockAuth =
  config.auth.clientId === '00000000-0000-0000-0000-000000000000' ||
  process.env.JEST_WORKER_ID !== undefined;

export const intuneAdapter: IntuneAdapter = useMockAuth
  ? new MockIntuneAdapter()
  : new MsalIntuneAdapter();

if (useMockAuth) {
  log.warn('Using MockIntuneAdapter — set a real INTUNE_CLIENT_ID in .env to enable MSAL');
} else {
  log.info('Using MsalIntuneAdapter', {
    tenantId: config.auth.tenantId,
    clientId: config.auth.clientId,
    redirectUri: config.auth.redirectUri,
  });
}
