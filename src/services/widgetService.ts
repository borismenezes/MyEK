import { apiClient } from '@api/client';
import { cacheManager } from '@offline/cacheManager';
import { widgetDefaults } from '@services/defaults';
import { appDataService } from '@services/appDataService';
import { leaveService } from '@services/leaveService';
import { businessCardService } from '@services/businessCardService';
import { appreciationsService } from '@services/appreciationsService';
import { attendanceService } from '@services/attendanceService';
import { payslipService } from '@services/payslipService';
import { timesheetService } from '@services/timesheetService';
import { rosterService } from '@services/rosterService';
import { myTripsService } from '@services/myTripsService';
import { eventsService } from '@services/eventsService';
import { documentsService } from '@services/documentsService';
import { useAuthStore } from '@store/useAuthStore';
import { useNetworkStore } from '@store/useNetworkStore';
import { createLogger } from '@utils/logger';
import type { ApiError, WidgetConfig } from '@/types';

const log = createLogger('Service/Widget');

export interface FetchResult<T> {
  data: T | null;
  error: string | null;
  fetchedAt: number;
  isStale: boolean;
  /** True when we returned cached data because the network was unavailable. */
  fromCache: boolean;
}

interface FetchOptions {
  /** Skip the cache and force a network round-trip. Used by pull-to-refresh. */
  force?: boolean;
}

/**
 * Single entry point for widgets to fetch their data.
 *
 * Strategy:
 *   1. Read cache. If fresh AND not forced → return immediately.
 *   2. If offline → return cache (any age) or error.
 *   3. Hit the network, write cache on success.
 *   4. On network failure → fall back to cache (flag stale) or surface the error.
 */
async function fetchWidget<T>(config: WidgetConfig, options: FetchOptions = {}): Promise<FetchResult<T>> {
  const cached = cacheManager.read<T>(config);
  const isOnline = isNetworkOnline();

  // Fresh cache — short-circuit unless forced.
  if (!options.force && cached && !cached.isStale) {
    return ok(cached.data, cached.fetchedAt, cached.isStale, true);
  }

  // Offline path — serve cache or fall back to bundled defaults.
  if (!isOnline) {
    if (cached) {
      log.debug(`Offline: serving cache for ${config.widgetId}`);
      return ok(cached.data, cached.fetchedAt, true, true);
    }
    const fallback = readDefault<T>(config);
    if (fallback) return ok(fallback, 0, true, true);
    return fail<T>('You are offline and no cached data is available.');
  }

  // Online path — go to the network.
  try {
    const data = await fetchFromBackend<T>(config);
    cacheManager.write(config, data);
    return ok(data, Date.now(), false, false);
  } catch (e) {
    const err = e as ApiError;
    log.warn(`Widget fetch failed for ${config.widgetId}`, err);
    if (cached) {
      // Network failed but we have something — show it, mark stale.
      return { data: cached.data, error: null, fetchedAt: cached.fetchedAt, isStale: true, fromCache: true };
    }
    const fallback = readDefault<T>(config);
    if (fallback) return ok(fallback, 0, true, true);
    return fail<T>(err.message || 'Failed to load');
  }
}

/**
 * Backend dispatch for a widget. Most widgets flow through the generic
 * `apiClient` (or `appDataService` when the widget carries an `appName` from
 * the manifest). The leave widget is routed to its dedicated APIM-backed
 * service because that service uses a different host, a subscription-key
 * header, and a path templated on the signed-in employee id.
 */
async function fetchFromBackend<T>(config: WidgetConfig): Promise<T> {
  if (config.widgetId === 'leave') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Leave widget requires a signed-in user with employeeId');
    return (await leaveService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'businessCard') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Business Card widget requires a signed-in user with employeeId');
    return (await businessCardService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'appreciations') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Appreciations widget requires a signed-in user with employeeId');
    return (await appreciationsService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'attendance') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Attendance widget requires a signed-in user with employeeId');
    return (await attendanceService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'payslip') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Payslip widget requires a signed-in user with employeeId');
    return (await payslipService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'timesheet') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Timesheet widget requires a signed-in user with employeeId');
    return (await timesheetService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'roster') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Roster widget requires a signed-in user with employeeId');
    return (await rosterService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'myTrips') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('My Trips widget requires a signed-in user with employeeId');
    return (await myTripsService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'events') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Events widget requires a signed-in user with employeeId');
    return (await eventsService.fetch(employeeId)) as unknown as T;
  }
  if (config.widgetId === 'documents') {
    const employeeId = useAuthStore.getState().user?.employeeId;
    if (!employeeId) throw new Error('Documents widget requires a signed-in user with employeeId');
    return (await documentsService.fetch(employeeId)) as unknown as T;
  }
  if (config.appName) {
    return appDataService.fetch<T>(config.appName, {
      apiVersion: config.apiVersion,
      endpoint: config.endpoint,
      params: config.params,
    });
  }
  return apiClient.get<T>(config.endpoint, {
    version: config.apiVersion,
    params: config.params,
  });
}

function readDefault<T>(config: WidgetConfig): T | null {
  const value = widgetDefaults[config.widgetId];
  return (value as T | undefined) ?? null;
}

function isNetworkOnline(): boolean {
  const s = useNetworkStore.getState();
  return s.isConnected && s.isInternetReachable !== false;
}

function ok<T>(data: T, fetchedAt: number, isStale: boolean, fromCache: boolean): FetchResult<T> {
  return { data, error: null, fetchedAt, isStale, fromCache };
}

function fail<T>(error: string): FetchResult<T> {
  return { data: null, error, fetchedAt: 0, isStale: false, fromCache: false };
}

/**
 * Warm the widget cache for `configs` in parallel. Each call goes through the
 * same fetchWidget path, so:
 *   - Already-fresh cache entries return immediately and consume no bandwidth.
 *   - Stale / missing entries hit the network and write back the cache.
 *
 * Used at boot to populate the cache before the home grid mounts so widgets
 * render with data on first frame instead of blank skeletons. The soft timeout
 * caps the total wait — slow individual fetches keep going in the background
 * and surface their result via the normal useWidgetData refresh flow.
 */
async function prefetchWidgets(
  configs: WidgetConfig[],
  options: { timeoutMs?: number } = {},
): Promise<void> {
  if (configs.length === 0) return;
  const timeoutMs = options.timeoutMs ?? 1500;
  const fetchAll = Promise.allSettled(configs.map(c => fetchWidget(c, { force: false })));
  await Promise.race([
    fetchAll,
    new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
  ]);
}

export const widgetService = {
  fetch: fetchWidget,
  prefetch: prefetchWidgets,
};
