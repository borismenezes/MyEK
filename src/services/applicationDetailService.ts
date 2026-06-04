import { apiClient } from '@api/client';
import { useAuthStore } from '@store/useAuthStore';
import { leaveDetailsService } from '@services/leaveDetailsService';
import { platinumVouchersService } from '@services/platinumVouchersService';
import { attendanceDetailsService } from '@services/attendanceDetailsService';
import { timesheetDetailsService } from '@services/timesheetDetailsService';
import { createLogger } from '@utils/logger';
import leaveDetails from './defaults/leaveDetails.json';
import platinumVouchers from './defaults/platinumVouchers.json';
import attendanceDetails from './defaults/attendanceDetails.json';
import timesheetDetails from './defaults/timesheetDetails.json';
import type { ApiVersion } from '@/types';

const log = createLogger('Service/AppDetail');

/**
 * Per-app fallback payloads, keyed by the manifest's `appName`. Used when
 * the backend is unreachable so the detail screen never renders empty —
 * also serves as the bundled offline source on first launch. Add an entry
 * here when wiring up a new app's detail surface; everything else
 * (manifest config + layout dispatch) is data-driven.
 */
const BUNDLED_DEFAULTS: Record<string, unknown> = {
  leave: leaveDetails,
  platinumVouchers: platinumVouchers,
  attendance: attendanceDetails,
  timesheet: timesheetDetails,
};

interface FetchOptions {
  /** Endpoint to call. Comes from the manifest entry's `detail.endpoint`. */
  endpoint?: string;
  /** API version override. Defaults to the manifest's `detail.apiVersion`. */
  apiVersion?: ApiVersion;
}

/**
 * Generic detail-data fetcher. Routes by `appName` so a single service
 * (and its corresponding layout component) can serve any app whose
 * manifest declares a `detail` config — leave today, attendance /
 * timesheet / payslip tomorrow.
 *
 * Strategy:
 *   1. If `endpoint` is supplied, hit the network. On success, return.
 *   2. On failure (or no endpoint configured), fall back to the bundled
 *      default JSON registered under `BUNDLED_DEFAULTS[appName]`.
 *   3. If neither source has data, throw — the layout surfaces an error
 *      state rather than rendering ambiguous empty content.
 */
async function fetchAppDetail<T>(appName: string, options: FetchOptions = {}): Promise<T> {
  log.debug(`Fetching detail for ${appName}`, { endpoint: options.endpoint });

  // APIM-backed detail surfaces dispatch to a dedicated service that owns
  // its env-configured path + APIM auth (subscription key + per-resource
  // token). The legacy `apiClient` branch below stays for any app whose
  // detail endpoint hasn't been migrated to APIM yet.
  try {
    if (appName === 'leave') {
      const employeeId = useAuthStore.getState().user?.employeeId;
      if (!employeeId) throw new Error('Leave detail requires a signed-in user with employeeId');
      return (await leaveDetailsService.fetch(employeeId)) as unknown as T;
    }
    if (appName === 'platinumVouchers') {
      return (await platinumVouchersService.fetch()) as unknown as T;
    }
    if (appName === 'attendance') {
      const employeeId = useAuthStore.getState().user?.employeeId;
      if (!employeeId) throw new Error('Attendance detail requires a signed-in user with employeeId');
      return (await attendanceDetailsService.fetch(employeeId)) as unknown as T;
    }
    if (appName === 'timesheet') {
      const employeeId = useAuthStore.getState().user?.employeeId;
      if (!employeeId) throw new Error('Timesheet detail requires a signed-in user with employeeId');
      return (await timesheetDetailsService.fetch(employeeId)) as unknown as T;
    }
  } catch (e) {
    log.warn(`APIM fetch failed for ${appName}, falling back to bundled default`, e);
  }

  if (options.endpoint) {
    try {
      const data = await apiClient.get<T>(options.endpoint, { version: options.apiVersion });
      return data;
    } catch (e) {
      log.warn(`Network fetch failed for ${appName}, falling back to bundled default`, e);
    }
  }

  const fallback = BUNDLED_DEFAULTS[appName];
  if (fallback !== undefined) return fallback as T;

  throw new Error(`No detail data available for app "${appName}"`);
}

export const applicationDetailService = {
  fetch: fetchAppDetail,
};
