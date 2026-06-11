import {
  init,
  loadRemote,
  preloadRemote,
  registerRemotes,
  type ModuleFederationRuntimePlugin,
} from '@module-federation/runtime';
import { config } from '@/config';
import { evictAllCachedScripts } from '../scriptStorage';
import { loadManifest, saveManifest } from './manifestCache';
import { SHELL_VERSION, semverGte } from './shellVersion';
import type { ServiceDefinition, ServiceMfCoords } from './types';

/**
 * Runtime registration + loading of federated remotes for the MyEK host.
 *
 * The host's own MF2 container is configured at build time
 * (ModuleFederationPluginV2, `remotes:{}`); remotes are added here at runtime
 * from the per-app catalog (`/v1/services/catalog?app=myek`). The host has zero
 * compile-time knowledge of any specific remote. Mirrors enterprise-app's
 * `dynamicRemotes.ts`. No custom ScriptManager resolver — Re.Pack's built-in
 * ResolverPlugin rebases chunk URLs from the manifest.
 *
 * Entry points: `loadExpose` (via FederatedWidget/FederatedRemote) self-registers
 * the remote it needs; the catalog itself is fetched into useCatalogStore after
 * sign-in (authService).
 */

/** Reserved expose keys the shell knows how to mount. */
export const EXPOSE_SCREENS = 'screens' as const;
export const EXPOSE_WIDGETS = 'widgets' as const;
export const EXPOSE_SETTINGS = 'settings' as const;

export type ReservedExposeKey =
  | typeof EXPOSE_SCREENS
  | typeof EXPOSE_WIDGETS
  | typeof EXPOSE_SETTINGS;

/**
 * Gate a catalog service before registering it as a remote. Release builds
 * reject non-https manifest URLs and (when the allowlist is non-empty) hosts
 * not on it. __DEV__ skips both so localhost dev servers work.
 */
function isAllowedRemote(service: ServiceDefinition): boolean {
  const url = service.mf!.manifestUrl;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn(`[MF] rejected unparseable manifest URL for "${service.id}"`);
    return false;
  }
  if (!__DEV__ && parsed.protocol !== 'https:') {
    console.warn(`[MF] rejected non-https manifest for "${service.id}": ${url}`);
    return false;
  }
  // Host pinning. Prefer the configured allowlist; if it's empty, fall back to
  // the OTA/catalog host(s) rather than allowing ANY https host in release
  // (the previous empty-allowlist behaviour was fail-open).
  const allow = config.mf.allowedRemoteHosts.length
    ? config.mf.allowedRemoteHosts
    : defaultAllowedHosts();
  if (!__DEV__ && allow.length > 0 && !allow.includes(parsed.hostname)) {
    console.warn(`[MF] rejected disallowed host for "${service.id}": ${parsed.hostname}`);
    return false;
  }
  return true;
}

/**
 * Fallback host pin when `allowedRemoteHosts` is unset: the configured OTA /
 * catalog host(s). Closes the empty-allowlist fail-open — in release, remotes
 * must come from the backend host this app already talks to.
 */
function defaultAllowedHosts(): string[] {
  const hosts = new Set<string>();
  for (const u of [config.mf.otaBaseUrl, config.mf.catalogUrl]) {
    try {
      if (u) hosts.add(new URL(u).hostname);
    } catch {
      /* ignore unparseable config URL */
    }
  }
  return [...hosts];
}

let initialised = false;

// One chunk-cache clear per session: the first remote whose integrity changed
// clears ALL cached chunks (see evictAllCachedScripts for why per-remote can't
// work), so subsequent changed remotes mustn't clear again — that would re-evict
// chunks the earlier clear already re-downloaded.
let chunkCacheClearedThisSession = false;

// Registered-remote tracking keyed on `remoteName:version` (version = bundleHash
// or manifestUrl) so a catalog refresh that rotates a remote's bundle re-points
// the runtime instead of no-opping on the stale registration.
const registered = new Set<string>();

function remoteKey(coords: ServiceMfCoords): string {
  return `${coords.remoteName}:${coords.bundleHash ?? coords.manifestUrl}`;
}

/** Clear registered-remote tracking (e.g. on account switch). */
export function resetRegisteredRemotes(): void {
  registered.clear();
}

/**
 * Hostname (no port) to substitute for loopback in catalog-supplied URLs,
 * derived from config.mf.otaBaseUrl. Returns hostname only so per-service ports
 * are preserved. MyEK's backend is a real host, so this is typically a no-op.
 */
function resolveClientHostname(): string | null {
  const base = config.mf.otaBaseUrl;
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return base.replace(/^https?:\/\//, '').replace(/[:/].*$/, '') || null;
  }
}

/** Swap a loopback host in the catalog manifest URL for the client-reachable one. */
function rewriteForPlatform(url: string): string {
  const target = resolveClientHostname();
  if (!target) return url;
  return url.replace(/(https?:\/\/)(?:localhost|127\.0\.0\.1)(?=[:/]|$)/, `$1${target}`);
}

/** Stable fingerprint of a manifest's per-chunk integrity map (sorted keys). */
function integrityFingerprint(manifest: unknown): string {
  const integrity = (manifest as { integrity?: Record<string, string> } | null)?.integrity;
  if (!integrity) return '';
  return Object.keys(integrity)
    .sort()
    .map(key => `${key}=${integrity[key]}`)
    .join('|');
}

/**
 * MF2 runtime plugin: last-known-good manifest caching. Persists each
 * successful manifest fetch; on a later failed fetch, serves the cached copy so
 * a previously-seen remote stays loadable offline. On an integrity change
 * (remote rebuilt), evicts the URL-keyed chunk cache so chunks re-download.
 */
const manifestCachePlugin: ModuleFederationRuntimePlugin = {
  name: 'lkg-manifest-cache',
  async fetch(manifestUrl: string, requestInit: RequestInit): Promise<Response> {
    const res = await fetch(manifestUrl, requestInit);
    if (!res.ok) {
      throw new Error(`[MF] manifest fetch ${res.status} for ${manifestUrl}`);
    }
    try {
      const json = await res.clone().json();
      // Key the LKG cache by the remote NAME (mf-manifest.json `name`), not the
      // URL: errorLoadRemote only receives the remote id, never the manifest URL,
      // so a URL key is a guaranteed miss (the offline path was dead).
      const remoteName = (json as { name?: string }).name ?? manifestUrl;
      const prev = loadManifest(remoteName);
      if (
        !chunkCacheClearedThisSession &&
        prev &&
        integrityFingerprint(prev) !== integrityFingerprint(json)
      ) {
        // A rebuilt remote reuses the same (deterministic) chunk URLs, so the
        // cached chunk would be served forever. Clear the whole MF chunk cache
        // once this session so every changed remote re-downloads; guarded so a
        // second changed remote doesn't re-evict what the first clear already
        // refreshed. (Per-remote eviction can't be done reliably — see
        // evictAllCachedScripts.)
        chunkCacheClearedThisSession = true;
        console.log(`[MF] integrity changed (${remoteName}) — clearing chunk cache so updated remotes re-download`);
        await evictAllCachedScripts();
      }
      saveManifest(remoteName, json);
    } catch {
      /* inspection + persistence are best-effort */
    }
    return res;
  },
  errorLoadRemote(args: { id: string; error: unknown; lifecycle: string }): unknown {
    if (args.lifecycle !== 'afterResolve') return undefined;
    // args.id is the remote request id (e.g. "leave/widgets" or "leave"); the
    // LKG cache is keyed by remote name, so match on the first segment.
    const remoteName = String(args.id).split('/')[0];
    const cached = loadManifest(remoteName);
    if (cached) {
      console.warn(`[MF] manifest fetch failed; serving last-known-good for ${remoteName}`);
      return cached;
    }
    return undefined;
  },
};

/** Initialise the MF2 runtime once. Safe to call repeatedly. */
export function initFederation(): void {
  if (initialised) return;
  init({ name: 'host', remotes: [], plugins: [manifestCachePlugin] });
  initialised = true;
  console.log('[MF] runtime initialised');
}

/**
 * Register every compatible service in the catalog as an MF2 remote. Skips
 * services without `mf` coords, failing the allowlist, or exceeding this shell's
 * version. Same-version re-registration is a no-op; a version-changed remote is
 * re-registered with `{force:true}`.
 */
export function registerCatalogRemotes(services: ServiceDefinition[]): void {
  initFederation();

  const compatible = services
    .filter(s => Boolean(s.mf))
    .filter(isAllowedRemote)
    .filter(s => semverGte(SHELL_VERSION, s.minShellVersion));

  const brandNew: Array<{ name: string; entry: string }> = [];
  const versionChanged: Array<{ name: string; entry: string }> = [];

  for (const s of compatible) {
    const coords = s.mf!;
    const key = remoteKey(coords);
    if (registered.has(key)) continue;

    const entry = { name: coords.remoteName, entry: rewriteForPlatform(coords.manifestUrl) };
    const prefix = `${coords.remoteName}:`;
    let hasStaleVersion = false;
    for (const existing of registered) {
      if (existing.startsWith(prefix)) {
        registered.delete(existing);
        hasStaleVersion = true;
      }
    }
    (hasStaleVersion ? versionChanged : brandNew).push(entry);
    registered.add(key);
  }

  if (brandNew.length) {
    console.log('[MF] register:', brandNew.map(r => `${r.name}=${r.entry}`).join(', '));
    registerRemotes(brandNew);
  }
  if (versionChanged.length) {
    console.log('[MF] register (force):', versionChanged.map(r => `${r.name}=${r.entry}`).join(', '));
    registerRemotes(versionChanged, { force: true });
  }
}

function resolveExposePath(coords: ServiceMfCoords, key: ReservedExposeKey): string | null {
  if (key === EXPOSE_SCREENS) return coords.exposes.screens ?? null;
  if (key === EXPOSE_SETTINGS) return coords.exposes.settings ?? null;
  if (key === EXPOSE_WIDGETS) return coords.exposes.widgets ?? null;
  return null;
}

/**
 * Warm the MF runtime + on-disk caches for services ahead of navigation. Pure
 * optimization — all errors swallowed; a failed preload just means lazy load at
 * navigation time.
 */
export function preloadServiceRemotes(
  services: ServiceDefinition[],
  exposes: ReservedExposeKey[],
): void {
  const eligible = services
    .filter(s => Boolean(s.mf))
    .filter(isAllowedRemote)
    .filter(s => semverGte(SHELL_VERSION, s.minShellVersion))
    .filter(s => exposes.some(key => resolveExposePath(s.mf!, key) != null));
  if (!eligible.length) return;
  try {
    void preloadRemote(
      eligible.map(s => ({ nameOrAlias: s.mf!.remoteName, exposes, depsRemote: false })),
    ).catch(() => {});
  } catch {
    /* swallow synchronous throws too */
  }
}

/**
 * Load an exposed module from a federated remote. Caller passes the resolved
 * `ServiceDefinition`. Throws when the service has no `mf` coords, the expose
 * key isn't published, or the remote fails to load. Callers wrap this in a
 * Suspense + error boundary (see FederatedRemote) so one broken remote can't
 * crash the shell.
 */
export async function loadExpose<T = unknown>(
  service: ServiceDefinition,
  key: ReservedExposeKey,
): Promise<T> {
  if (!service.mf) {
    throw new Error(`[MF] service "${service.id}" has no mf coords.`);
  }
  registerCatalogRemotes([service]);

  const exposePath = resolveExposePath(service.mf, key);
  if (!exposePath) {
    throw new Error(`[MF] service "${service.id}" does not expose "${key}".`);
  }

  // MF runtime convention: "{remoteName}/{exposeKey-without-leading-./}".
  const normalised = exposePath.replace(/^\.\//, '');
  const request = `${service.mf.remoteName}/${normalised}`;

  const mod = await loadRemote<T>(request);
  if (mod == null) {
    throw new Error(`[MF] loadRemote("${request}") returned null.`);
  }
  return mod;
}
