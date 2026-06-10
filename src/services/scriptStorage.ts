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
 * content-hashed — a rebuilt remote reuses the same chunk URLs. Invalidation on
 * a remote update is therefore explicit: dynamicRemotes' manifest-cache plugin
 * diffs each manifest's `integrity` map and calls `evictRevokedScripts` for
 * just that remote when it changed.
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
 * Evict cached scripts (locator data + downloaded chunk files) for remotes no
 * longer entitled. Goes through `invalidateScripts` rather than touching MMKV
 * directly because Re.Pack stores its whole locator cache under a single key.
 * Best-effort; all errors swallowed. (Used by dynamicRemotes' manifest-cache
 * plugin when a remote's integrity map changes.)
 */
export async function evictRevokedScripts(revokedRemoteNames: string[]): Promise<void> {
  if (!revokedRemoteNames.length) return;
  try {
    await ScriptManager.shared.invalidateScripts(revokedRemoteNames);
  } catch {
    // Eviction is best-effort; a stale chunk file is wasted disk, not a bug.
  }
}

/**
 * Clear Re.Pack's entire downloaded-script cache (locator blob + native chunk
 * files) so the next load of every remote re-downloads. Coarse escape hatch —
 * currently unused (the manifest-cache plugin evicts per-remote via
 * `evictRevokedScripts`); kept for debug/reset flows. Best-effort.
 */
export async function evictAllCachedScripts(): Promise<void> {
  try {
    await ScriptManager.shared.invalidateScripts();
  } catch {
    // Best-effort; a stale chunk just means one extra (correct) re-download.
  }
}
