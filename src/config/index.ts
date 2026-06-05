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

// ── enterprise-backend integration defaults ───────────────────────────────
// The enterprise edge (Kong) terminates auth: it validates the Entra bearer
// against the Emirates tenant and expects the enterprise-app API audience. We
// mirror enterprise-app's single-token model — one resource-scoped token
// (`access_as_user`) is acquired and attached to every call; there is no longer
// a separate sign-in token. Override any of these via the matching env var.
const ENTERPRISE_TENANT_ID = '86ba65bc-68d5-4e44-9445-b2b8a7a64d5a';
const ENTERPRISE_API_SCOPE = 'api://c5bc7a7d-550e-408a-9324-b026a363ddf0/access_as_user';
// Public host fronted by Kong. Both the versioned `apiClient` (`{host}/v1`) and
// the MyEK service client point here; all MyEK data is served by the backend
// BFF under `/v1/myek/**`.
const ENTERPRISE_API_HOST = 'https://thon.mohsal.dev';
// MyEK's Entra app registration (the client). Both platforms use it now — the
// token's audience is the enterprise-app resource regardless of client, so a
// single registration serves iOS + Android. Per-environment overrides (e.g. the
// real Emirates prod app reg) go via INTUNE_CLIENT_ID.
const ENTERPRISE_CLIENT_ID = '3122181f-0de3-49fc-9903-c081d7305f22';

/**
 * Centralised, environment-driven config.
 *
 * Values are loaded at build-time by `react-native-dotenv` (configured in
 * babel.config.js). Each key has a compile-time default so the app still
 * boots if `.env` is missing.
 */
const pick = (value: string | undefined, fallback: string): string =>
  value && value.length > 0 ? value : fallback;

const apiBaseUrl = pick(API_BASE_URL, ENTERPRISE_API_HOST);

export const config = {
  api: {
    baseUrl: apiBaseUrl,
    defaultVersion: pick(API_DEFAULT_VERSION, 'v1') as ApiVersion,
    timeoutMs: parseInt(pick(API_TIMEOUT_MS, '15000'), 10),
    maxRetries: parseInt(pick(API_MAX_RETRIES, '3'), 10),
  },
  auth: {
    tenantId: pick(INTUNE_TENANT_ID, ENTERPRISE_TENANT_ID),
    clientId: pick(INTUNE_CLIENT_ID, ENTERPRISE_CLIENT_ID),
    redirectUri: pick(INTUNE_REDIRECT_URI, defaultRedirectUri),
    // Single token: the sign-in scope IS the resource API scope, so MSAL issues
    // one `access_as_user` token (aud = enterprise-app) that Kong accepts and
    // every call carries. `INTUNE_SCOPE` overrides only if you need extra scopes.
    scope: pick(INTUNE_SCOPE, ENTERPRISE_API_SCOPE).split(/[ ,]+/).filter(Boolean),
    get authority(): string {
      return `https://login.microsoftonline.com/${this.tenantId}`;
    },
  },
  apim: {
    // Points at the same Kong edge as `apiClient`. APIM (Azure) is retired —
    // the legacy subscription-key header is gone (default empty) and every MyEK
    // service is served by the backend BFF under `/v1/myek/**`.
    baseUrl: pick(APIM_BASE_URL, apiBaseUrl),
    subscriptionKey: pick(APIM_SUBSCRIPTION_KEY, ''),
    // Same single token as the rest of the app (aud = enterprise-app).
    scope: pick(API_SCOPE, ENTERPRISE_API_SCOPE).split(/[ ,]+/).filter(Boolean),
    // BFF routes. Identity comes from the JWT (employee_id) at the edge, so the
    // `{employeeId}` path param is gone — `buildPath` leaves these unchanged.
    //   ✓ = MyEK BFF endpoint implemented today (real adapter or mock).
    //   ◦ = not yet on the BFF; the call 404s and the service falls back to its
    //       bundled default until the adapter lands (incremental rollout).
    paths: {
      leave: pick(APIM_PATH_LEAVE, '/v1/myek/leave/widget'),                          // ✓
      businessCard: pick(APIM_PATH_BUSINESS_CARD, '/v1/myek/business-card'),           // ✓
      appreciations: pick(APIM_PATH_APPRECIATIONS, '/v1/myek/appreciations/widget'),   // ✓
      attendance: pick(APIM_PATH_ATTENDANCE, '/v1/myek/attendance/widget'),            // ✓
      payslip: pick(APIM_PATH_PAYSLIP, '/v1/myek/payslip/widget'),                     // ✓
      roster: pick(APIM_PATH_ROSTER, '/v1/myek/roster/widget'),                        // ✓
      timesheet: pick(APIM_PATH_TIMESHEET, '/v1/myek/timesheet/widget'),               // ✓
      myTrips: pick(APIM_PATH_MY_TRIPS, '/v1/myek/my-trips/widget'),                    // ✓
      events: pick(APIM_PATH_EVENTS, '/v1/myek/events/widget'),                         // ✓
      documents: pick(APIM_PATH_DOCUMENTS, '/v1/myek/documents/widget'),                // ✓
      platinumVouchers: pick(APIM_PATH_PLATINUM_VOUCHERS, '/v1/myek/platinum/vouchers'),// ✓
      platinumCard: pick(APIM_PATH_PLATINUM_CARD, '/v1/myek/platinum/card'),            // ✓
      leaveDetails: pick(APIM_PATH_LEAVE_DETAILS, '/v1/myek/leave/details'),            // ✓ (real leave-service)
      profilePicture: pick(APIM_PATH_PROFILE_PICTURE, '/v1/myek/profile-picture'),      // ◦
      applicationsManifest: pick(APIM_PATH_APPLICATIONS_MANIFEST, '/v1/myek/applications'), // ◦ (bootstrap supplies the manifest)
      attendanceDetails: pick(APIM_PATH_ATTENDANCE_DETAILS, '/v1/myek/attendance/week'),// ◦
      userProfile: pick(APIM_PATH_USER_PROFILE, '/v1/myek/user'),                       // ◦ (bootstrap supplies identity)
      timesheetDetails: pick(APIM_PATH_TIMESHEET_DETAILS, '/v1/myek/timesheet/details'),// ◦
      myPayslip: pick(APIM_PATH_MY_PAYSLIP, '/v1/myek/payslip/details'),                // ◦
    },
  },
  log: {
    level: pick(LOG_LEVEL, 'info') as 'debug' | 'info' | 'warn' | 'error',
    remoteEnabled: pick(LOG_REMOTE_ENABLED, 'false') === 'true',
  },
} as const;

export type AppConfigShape = typeof config;
