import { apiClient } from '@api/client';
import { endpoints } from '@api/endpoints';
import { createLogger } from '@utils/logger';
import type { ApiVersion } from '@/types';

const log = createLogger('Service/AppData');

/**
 * Generic per-application data fetcher.
 *
 * Replaces the historical pattern where each widget knew its specific
 * endpoint. Now the widget says "I represent app X, give me X's data" and
 * this service handles the routing.
 *
 * Two routing strategies, in order:
 *
 * 1. **Override** — caller passes an explicit `endpoint` (typically from
 *    the applications manifest). This is the path most apps will take
 *    while their backends are still hosted at bespoke URLs.
 *
 * 2. **Convention** — fall back to `GET /apps/{appName}`, the generic
 *    contract every backend service will eventually expose. Adopt this
 *    once your backends standardise on the manifest-driven layout.
 *
 * On any failure, callers receive `null` from the catch arm in
 * `widgetService` and the bundled-defaults path takes over there — so we
 * don't double-up fallbacks here.
 */
export interface AppDataFetchOptions {
  /** API version to send the request against. Defaults to v1. */
  apiVersion?: ApiVersion;
  /**
   * Explicit endpoint override from the manifest (`AppManifestEntry.endpoint`).
   * When present, this wins over the conventional `/apps/{appName}` route.
   */
  endpoint?: string;
  /** Optional query params merged into the request. */
  params?: Record<string, string | number | boolean>;
}

async function fetchAppData<T = unknown>(
  appName: string,
  options: AppDataFetchOptions = {},
): Promise<T> {
  const url = options.endpoint ?? endpoints.applications.data(appName);
  log.debug(`Fetching app data for "${appName}"`, { url, version: options.apiVersion });
  return apiClient.get<T>(url, {
    version: options.apiVersion,
    params: options.params,
  });
}

export const appDataService = {
  fetch: fetchAppData,
};
