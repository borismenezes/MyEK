import type { WidgetConfig } from '@/types';
import { useCacheStore } from '@store/useCacheStore';

/** TTL after which cached data is considered stale (still rendered + flagged) */
const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes
/** Hard expiry — data older than this is dropped on read */
const EXPIRY_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedWidgetData<T> {
  data: T;
  fetchedAt: number;
  isStale: boolean;
}

/**
 * Compose a stable cache key per (widget, version, params).
 * Including the version + params stops a v1 cache from being served when the
 * server has rolled the user to v2, or when params have changed.
 */
export function widgetCacheKey(config: WidgetConfig): string {
  const paramHash = config.params ? JSON.stringify(config.params) : '';
  return `widget:${config.widgetId}:${config.apiVersion}:${paramHash}`;
}

export const cacheManager = {
  read<T>(config: WidgetConfig): CachedWidgetData<T> | null {
    const key = widgetCacheKey(config);
    const entry = useCacheStore.getState().read<T>(key);
    if (!entry) return null;
    const age = Date.now() - entry.fetchedAt;
    if (age > EXPIRY_AFTER_MS) {
      useCacheStore.getState().invalidate(key);
      return null;
    }
    return { data: entry.data, fetchedAt: entry.fetchedAt, isStale: age > STALE_AFTER_MS };
  },

  write<T>(config: WidgetConfig, data: T): void {
    const key = widgetCacheKey(config);
    useCacheStore.getState().write(key, data, config.apiVersion);
  },

  invalidate(config: WidgetConfig): void {
    useCacheStore.getState().invalidate(widgetCacheKey(config));
  },

  /** Wipe every cached payload — called on sign-out or version migration. */
  clearAll(): void {
    useCacheStore.getState().clearAll();
  },
};
