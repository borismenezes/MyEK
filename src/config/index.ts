import {
  API_BASE_URL,
  API_DEFAULT_VERSION,
  API_TIMEOUT_MS,
  API_MAX_RETRIES,
  INTUNE_TENANT_ID,
  INTUNE_CLIENT_ID,
  INTUNE_REDIRECT_URI,
  INTUNE_SCOPE,
  APIM_BASE_URL,
  APIM_SUBSCRIPTION_KEY,
  API_SCOPE,
  APIM_PATH_LEAVE,
  APIM_PATH_BUSINESS_CARD,
  APIM_PATH_APPRECIATIONS,
  APIM_PATH_ATTENDANCE,
  APIM_PATH_PAYSLIP,
  APIM_PATH_ROSTER,
  APIM_PATH_TIMESHEET,
  APIM_PATH_MY_TRIPS,
  APIM_PATH_EVENTS,
  APIM_PATH_PROFILE_PICTURE,
  APIM_PATH_APPLICATIONS_MANIFEST,
  APIM_PATH_DOCUMENTS,
  APIM_PATH_LEAVE_DETAILS,
  APIM_PATH_PLATINUM_VOUCHERS,
  APIM_PATH_ATTENDANCE_DETAILS,
  APIM_PATH_USER_PROFILE,
  APIM_PATH_TIMESHEET_DETAILS,
  APIM_PATH_MY_PAYSLIP,
  APIM_PATH_PLATINUM_CARD,
  LOG_LEVEL,
  LOG_REMOTE_ENABLED,
} from '@env';
import { Platform } from 'react-native';
import type { ApiVersion } from '@/types';

const defaultRedirectUri = Platform.select({
  ios: 'msauth.com.myek.app.bm.dev://auth',
  android: 'msauth://com.myek.app.bm.dev/Xo8WBi6jzSxKDVR4drqm84yr9iU%3D',
  default: 'msauth.com.myek.app.bm.dev://auth',
});

// Android dev uses a separate app registration so we can iterate without
// changing the iOS-shared Emirates app reg. Forces Android off env and onto
// this client id; iOS continues to read INTUNE_CLIENT_ID from .env.
const clientIdOverride = Platform.select<string | undefined>({
  android: 'd3c3e357-0ec2-4773-9a87-0d8568af71b9',
  default: undefined,
});

/**
 * Centralised, environment-driven config.
 *
 * Values are loaded at build-time by `react-native-dotenv` (configured in
 * babel.config.js). Each key has a compile-time default so the app still
 * boots if `.env` is missing.
 */
const pick = (value: string | undefined, fallback: string): string =>
  value && value.length > 0 ? value : fallback;

export const config = {
  api: {
    baseUrl: pick(API_BASE_URL, 'https://api.myek.emirates.com'),
    defaultVersion: pick(API_DEFAULT_VERSION, 'v1') as ApiVersion,
    timeoutMs: parseInt(pick(API_TIMEOUT_MS, '15000'), 10),
    maxRetries: parseInt(pick(API_MAX_RETRIES, '3'), 10),
  },
  auth: {
    tenantId: pick(INTUNE_TENANT_ID, 'common'),
    clientId: clientIdOverride ?? pick(INTUNE_CLIENT_ID, '00000000-0000-0000-0000-000000000000'),
    redirectUri: pick(INTUNE_REDIRECT_URI, defaultRedirectUri),
    scope: pick(INTUNE_SCOPE, 'User.Read').split(/[ ,]+/).filter(Boolean),
    get authority(): string {
      return `https://login.microsoftonline.com/${this.tenantId}`;
    },
  },
  apim: {
    baseUrl: pick(APIM_BASE_URL, ''),
    subscriptionKey: pick(APIM_SUBSCRIPTION_KEY, ''),
    scope: pick(API_SCOPE, '').split(/[ ,]+/).filter(Boolean),
    // Path templates per service. `{employeeId}` is substituted at call
    // time by `buildPath` in `@api/apimClient`. Override via env vars
    // (APIM_PATH_*) — these defaults are the source of truth when env is
    // missing.
    paths: {
      leave: pick(APIM_PATH_LEAVE, '/clone/hr/myek/leave/leaveWidget/{employeeId}'),
      businessCard: pick(APIM_PATH_BUSINESS_CARD, '/hr/myek/employee/businessCard/{employeeId}'),
      appreciations: pick(APIM_PATH_APPRECIATIONS, '/clone-6a044/hr/myek/employee/appreciations/widget/{employeeId}'),
      attendance: pick(APIM_PATH_ATTENDANCE, '/hr/myek/employee/attendance/widget/{employeeId}'),
      payslip: pick(APIM_PATH_PAYSLIP, '/clone-clone-clone/hr/myek/ekApp/payroll/payslip/{employeeId}'),
      roster: pick(APIM_PATH_ROSTER, '/hr/myek/employee/roasters/widget/{employeeId}'),
      timesheet: pick(APIM_PATH_TIMESHEET, '/hr/myek/employee/timesheets/widget/{employeeId}'),
      myTrips: pick(APIM_PATH_MY_TRIPS, '/hr/myek/employee/myTrips/widget/{employeeId}'),
      events: pick(APIM_PATH_EVENTS, '/clone-6a045/hr/myek/employee/events/widget/{employeeId}'),
      profilePicture: pick(APIM_PATH_PROFILE_PICTURE, '/hr/myek/employee/profile/widget/{employeeId}'),
      applicationsManifest: pick(APIM_PATH_APPLICATIONS_MANIFEST, '/clone-clone/hr/myek/ekApp/applications/{employeeId}'),
      documents: pick(APIM_PATH_DOCUMENTS, '/hr/myek/employee/documents/widget/{employeeId}'),
      leaveDetails: pick(APIM_PATH_LEAVE_DETAILS, '/clone/clone-6a043/hr/myek/leave/leaveDetails/{employeeId}'),
      platinumVouchers: pick(APIM_PATH_PLATINUM_VOUCHERS, '/hr/myek/platinum/voucherDetails'),
      attendanceDetails: pick(APIM_PATH_ATTENDANCE_DETAILS, '/hr/myek/employee/attendance/weekDetails/{employeeId}'),
      userProfile: pick(APIM_PATH_USER_PROFILE, '/hr/myek/employee/idCard/widget/{employeeId}'),
      timesheetDetails: pick(APIM_PATH_TIMESHEET_DETAILS, '/hr/myek/employee/timesheetDetails/widget/{employeeId}'),
      myPayslip: pick(APIM_PATH_MY_PAYSLIP, '/hr/myek/employee/myPayslip/widget/{employeeId}'),
      platinumCard: pick(APIM_PATH_PLATINUM_CARD, '/hr/myek/platinum/cardDetails'),
    },
  },
  log: {
    level: pick(LOG_LEVEL, 'info') as 'debug' | 'info' | 'warn' | 'error',
    remoteEnabled: pick(LOG_REMOTE_ENABLED, 'false') === 'true',
  },
} as const;

export type AppConfigShape = typeof config;
