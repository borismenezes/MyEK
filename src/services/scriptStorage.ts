import { createMMKV } from 'react-native-mmkv';
import { ScriptManager, type StorageApi } from '@callstack/repack/client';

type MMKVInstance = ReturnType<typeof createMMKV>;

/**
 * MMKV-backed persistent storage for Re.Pack's `ScriptManager`.
 *
 * Re.Pack's native ScriptManager downloads remote chunks to the app's
 * filesystem cache. Without a `storage` backend it can't confirm across a cold
 * start that a cached chunk still matches the resolved locator, so it re-fetches
 * every chunk on every launch. Wiring this in via
 * `ScriptManager.shared.setStorage(...)` persists the locator data, which lets a
 * previously-downloaded federated bundle load straight from disk — incl. offline.
 *
 * Dedicated MMKV namespace, separate from any app/SWR caches so they evict
 * independently.
 *
 * Re.Pack chunk filenames are deterministic (`[name].chunk.bundle`), NOT
 * content-hashed — a rebuilt remote reuses the same chunk URLs, so ScriptManager
 * would serve the stale cached chunk forever. Invalidation on a remote update is
 * therefore explicit: dynamicRemotes' manifest-cache plugin diffs each manifest's
 * `integrity` map and, on a change, calls `evictAllCachedScripts` (once per
 * session) so every updated remote re-downloads.
 */
const MMKV_ID = 'mf-script-cache';

let store: MMKVInstance | null = null;

function getStore(): MMKVInstance {
  if (!store) {
    store = createMMKV({ id: MMKV_ID });
  }
  return store;
}

export const scriptStorage: StorageApi = {
  async getItem(key: string): Promise<string | null | undefined> {
    return getStore().getString(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    getStore().set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    getStore().remove(key);
  },
};

/**
 * Clear Re.Pack's entire downloaded-script cache (locator blob + native chunk
 * files) so the next load of every remote re-downloads.
 *
 * This is intentionally coarse. Per-remote eviction is not reliable here:
 * ScriptManager keys its cache by `locator.uniqueId` (not the remote name), and
 * the native side keys downloaded files by scriptId — so `invalidateScripts([
 * remoteName])` matches neither and silently no-ops, AND even a correct
 * `invalidateScripts([scriptId])` would only drop the container, not the
 * `__federation_expose_*` chunks that actually changed. Clearing everything once
 * (on the first detected integrity change in a session) is the robust option:
 * every changed remote re-downloads; an unchanged remote re-downloads once
 * (cheap, infrequent — only happens when something was republished). Passing no
 * args clears all cache keys. Best-effort.
 */
export async function evictAllCachedScripts(): Promise<void> {
  try {
    await ScriptManager.shared.invalidateScripts();
  } catch {
    // Best-effort; a stale chunk just means one extra (correct) re-download.
  }
}
