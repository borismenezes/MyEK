/**
 * Centralised endpoint catalogue.
 *
 * Keep all server URLs in one file so version bumps and migrations can be
 * audited in a single diff. Use template helpers for any path with params.
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  home: {
    // MyEK BFF bootstrap (apiClient prepends `/v1` → `/v1/myek/bootstrap`).
    // Returns user, permissions, apps, widgetLayout, apiVersions, featureFlags
    // (no session — the frontend supplies that from its MSAL result).
    bootstrap: '/myek/bootstrap',
  },
  ai: {
    // Backend AI service (SSE). Not behind the MyEK BFF — consumed directly
    // via the SSE client (axios can't stream). Path is relative to `/v{version}`.
    chat: '/ai/chat',
  },
  widgets: {
    /** Generic — the WidgetService passes the endpoint from WidgetConfig directly. */
  },
  user: {
    profile: '/user/profile',
    permissions: '/user/permissions',
    /** Returns the user's profile picture as `{ base64, mimeType }`. */
    photo: '/user/photo',
  },
  applications: {
    /** Per-user manifest of enabled apps + their widget assignments. */
    manifest: '/applications/manifest',
    /** Generic per-app data endpoint: GET /apps/{appName}. */
    data: (appName: string) => `/apps/${encodeURIComponent(appName)}`,
  },
  leave: {
    balance: '/leave/balance',
    apply: '/leave/apply',
  },
  payslip: {
    latest: '/payslip/latest',
    history: '/payslip/history',
  },
  attendance: {
    today: '/attendance/today',
    week: '/attendance/week',
  },
  card: {
    me: '/card/me',
    share: (id: string) => `/card/${encodeURIComponent(id)}/share`,
  },
  birthday: {
    today: '/celebrations/birthday/today',
  },
} as const;
