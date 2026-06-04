/**
 * Storage adapter.
 *
 * Wraps `react-native-mmkv` (synchronous, fast) behind an interface so we can:
 *  - Swap to AsyncStorage in environments where MMKV's native module isn't available (Jest)
 *  - Mock easily in tests
 *  - Add namespacing / encryption later without touching call sites
 */
import { createMMKV, type MMKV } from 'react-native-mmkv';

export interface KeyValueStore {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  delete(key: string): void;
  contains(key: string): boolean;
  getAllKeys(): string[];
  clearAll(): void;
}

class MmkvStore implements KeyValueStore {
  private mmkv: MMKV;
  constructor(id: string) {
    this.mmkv = createMMKV({ id });
  }
  getString(key: string) {
    return this.mmkv.getString(key) ?? null;
  }
  setString(key: string, value: string) {
    this.mmkv.set(key, value);
  }
  delete(key: string) {
    this.mmkv.remove(key);
  }
  contains(key: string) {
    return this.mmkv.contains(key);
  }
  getAllKeys() {
    return this.mmkv.getAllKeys();
  }
  clearAll() {
    this.mmkv.clearAll();
  }
}

/**
 * In-memory store, used as a safe fallback under Jest where the native
 * MMKV module isn't linked. Production code never hits this branch.
 */
class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string) {
    this.map.set(key, value);
  }
  delete(key: string) {
    this.map.delete(key);
  }
  contains(key: string) {
    return this.map.has(key);
  }
  getAllKeys() {
    return Array.from(this.map.keys());
  }
  clearAll() {
    this.map.clear();
  }
}

function makeStore(id: string): KeyValueStore {
  try {
    return new MmkvStore(id);
  } catch {
    return new MemoryStore();
  }
}

/** Three logically-separate stores so we can clear one (cache) without nuking auth. */
export const stores = {
  auth: makeStore('myek.auth'),
  cache: makeStore('myek.cache'),
  prefs: makeStore('myek.prefs'),
};

/**
 * Typed JSON helpers. They serialise on write and parse on read,
 * returning null on parse errors so callers don't need try/catch boilerplate.
 */
export const json = {
  get<T>(store: KeyValueStore, key: string): T | null {
    const raw = store.getString(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  set<T>(store: KeyValueStore, key: string, value: T) {
    store.setString(key, JSON.stringify(value));
  },
};
