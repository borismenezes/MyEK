import { createMMKV } from 'react-native-mmkv';

type MMKVInstance = ReturnType<typeof createMMKV>;

/**
 * Last-known-good (LKG) cache for federated-remote `mf-manifest.json`.
 *
 * The MF runtime fetches each remote's manifest fresh on every cold start. The
 * `manifestCachePlugin` in dynamicRemotes persists every successful fetch here,
 * and on a later failed fetch (offline / server error) serves the cached copy —
 * so a previously-seen remote stays loadable offline, paired with the on-disk
 * chunk bytes from ScriptManager's storage.
 *
 * Dedicated MMKV namespace, separate from the chunk cache (`mf-script-cache`)
 * so they evict independently. Keyed by manifest URL.
 */
const MMKV_ID = 'mf-manifest-cache';

let store: MMKVInstance | null = null;

function getStore(): MMKVInstance {
  if (!store) {
    store = createMMKV({ id: MMKV_ID });
  }
  return store;
}

export function saveManifest(manifestUrl: string, manifest: unknown): void {
  try {
    getStore().set(manifestUrl, JSON.stringify(manifest));
  } catch {
    // Best-effort persistence; a miss just means a re-fetch next time.
  }
}

export function loadManifest(manifestUrl: string): unknown | null {
  try {
    const raw = getStore().getString(manifestUrl);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
