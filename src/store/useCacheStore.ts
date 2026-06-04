import { create } from 'zustand';
import { stores, json } from '@utils/storage';

export interface CacheEntry<T = unknown> {
  data: T;
  fetchedAt: number;
  /** API version that produced this payload — invalidated if the version changes. */
  version: string;
}

interface CacheState {
  entries: Record<string, CacheEntry>;
}

interface CacheActions {
  hydrate(): void;
  read<T>(key: string): CacheEntry<T> | null;
  write<T>(key: string, data: T, version: string): void;
  invalidate(key: string): void;
  clearAll(): void;
}

const STORAGE_KEY = 'cache.entries.v1';

/**
 * In-memory cache store mirrored to MMKV. We mirror to disk because:
 *  - Cold-start should show last-known-good data instantly
 *  - Offline sessions should survive app kills
 */
export const useCacheStore = create<CacheState & CacheActions>((set, get) => ({
  entries: {},

  hydrate() {
    const persisted = json.get<Record<string, CacheEntry>>(stores.cache, STORAGE_KEY);
    if (persisted) set({ entries: persisted });
  },

  read<T>(key: string) {
    const entry = get().entries[key];
    return entry ? (entry as CacheEntry<T>) : null;
  },

  write<T>(key: string, data: T, version: string) {
    const entries = { ...get().entries, [key]: { data, fetchedAt: Date.now(), version } };
    set({ entries });
    json.set(stores.cache, STORAGE_KEY, entries);
  },

  invalidate(key: string) {
    const entries = { ...get().entries };
    delete entries[key];
    set({ entries });
    json.set(stores.cache, STORAGE_KEY, entries);
  },

  clearAll() {
    set({ entries: {} });
    stores.cache.delete(STORAGE_KEY);
  },
}));
