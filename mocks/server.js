/**
 * MyEK mock backend.
 *
 * Run with: `npm run mock` (port 4000 by default).
 *
 * Mounts every endpoint the app calls and returns deterministic fixtures
 * shaped exactly like the real API will produce.
 *
 * Notes:
 *  - The /v1 and /v2 prefixes both work — v2 returns a subset of fields with
 *    a small enhancement so you can see the version-routing in action.
 *  - The /auth/login endpoint accepts ANY grant — there's no real validation.
 *  - All responses are wrapped in the { data, meta } envelope the client
 *    expects.
 */

const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ─── Helpers ────────────────────────────────────────────────────────────
function envelope(data, version = 'v1') {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version,
      requestId: 'mock_' + Math.random().toString(36).slice(2, 10),
    },
  };
}

function send(res, data, version) {
  res.json(envelope(data, version));
}

// Inject the version onto every request based on the URL prefix.
app.use((req, _res, next) => {
  const m = req.path.match(/^\/(v\d+)\//);
  req.apiVersion = m ? m[1] : 'v1';
  next();
});

// ─── Auth ───────────────────────────────────────────────────────────────
function makeSession() {
  return {
    accessToken: 'mock-access-' + Math.random().toString(36).slice(2),
    refreshToken: 'mock-refresh-' + Math.random().toString(36).slice(2),
    expiresAt: Date.now() + 60 * 60 * 1000,
    idToken: 'mock-id-token',
    scope: ['openid', 'profile', 'offline_access'],
  };
}

function makeBootstrap(session) {
  return {
    user: {
      id: 'usr_10000',
      employeeId: '10000',
      firstName: 'Elvina',
      lastName: 'Martis',
      email: 'e.martis@emirates.com',
      jobTitle: 'Technology Experience Specialist',
      department: 'EMIRATES GROUP IT-EIT',
      grade: 'EK.08',
      location: 'EK Tech Centre',
      joinedAt: '2025-11-01T00:00:00Z',
    },
    session,
    permissions: [
      'home.read',
      'profile.read',
      'profile.write',
      'leave.read',
      'leave.write',
      'payslip.read',
      'attendance.read',
      'card.read',
      'card.share',
    ],
    apps: [
      { appId: 'leave', name: 'Leave', icon: 'calendar', enabled: true, apiVersion: 'v2', widgets: [] },
      { appId: 'attendance', name: 'Attendance', icon: 'clock', enabled: true, apiVersion: 'v1', widgets: [] },
      { appId: 'payslip', name: 'Payslip', icon: 'wallet', enabled: true, apiVersion: 'v1', widgets: [] },
      { appId: 'card', name: 'Business Card', icon: 'card', enabled: true, apiVersion: 'v1', widgets: [] },
      { appId: 'birthday', name: 'Celebrations', icon: 'cake', enabled: true, apiVersion: 'v1', widgets: [] },
    ],
    widgetLayout: [
      { widgetId: 'birthday', apiVersion: 'v1', endpoint: '/celebrations/birthday/today', layout: { size: 'large' }, refreshIntervalMs: 0 },
      { widgetId: 'businessCard', apiVersion: 'v1', endpoint: '/card/me', layout: { size: 'large' } },
      { widgetId: 'leave', apiVersion: 'v2', endpoint: '/leave/balance', layout: { size: 'small' } },
      { widgetId: 'attendance', apiVersion: 'v1', endpoint: '/attendance/today', layout: { size: 'small' } },
      { widgetId: 'payslip', apiVersion: 'v1', endpoint: '/payslip/latest', layout: { size: 'large' } },
      { widgetId: 'timesheet', apiVersion: 'v1', endpoint: '/timesheet/week', layout: { size: 'small' } },
      { widgetId: 'documents', apiVersion: 'v1', endpoint: '/documents/next-expiry', layout: { size: 'small' } },
      { widgetId: 'appreciations', apiVersion: 'v1', endpoint: '/appreciations/latest', layout: { size: 'large' } },
      { widgetId: 'applications', apiVersion: 'v1', endpoint: '/applications/summary', layout: { size: 'small' } },
      { widgetId: 'roster', apiVersion: 'v1', endpoint: '/roster/week', layout: { size: 'large' } },
      { widgetId: 'myTrips', apiVersion: 'v1', endpoint: '/trips/next', layout: { size: 'small' } },
    ],
    apiVersions: {
      home: 'v1',
      leave: 'v2',
      payslip: 'v1',
      attendance: 'v1',
      card: 'v1',
      birthday: 'v1',
    },
    featureFlags: {
      darkMode: true,
      offlineMode: true,
      dragAndDrop: true,
      biometricLogin: false,
      platinumCard: true,
      widgetRefreshPull: true,
    },
  };
}

app.post(['/v1/auth/login', '/v2/auth/login'], (req, res) => {
  const session = makeSession();
  send(res, makeBootstrap(session), req.apiVersion);
});

app.post(['/v1/auth/refresh', '/v2/auth/refresh'], (_req, res) => {
  send(res, makeSession());
});

app.post(['/v1/auth/logout', '/v2/auth/logout'], (_req, res) => {
  res.status(204).end();
});

app.get(['/v1/home/bootstrap', '/v2/home/bootstrap'], (req, res) => {
  send(res, makeBootstrap(makeSession()), req.apiVersion);
});

// ─── Widget endpoints ───────────────────────────────────────────────────
app.get('/v1/celebrations/birthday/today', (_req, res) => {
  send(res, {
    name: 'Elvina Martis',
    message:
      'On behalf of the Emirates Group, we wish you a year of safe skies, new horizons, and well-earned moments. Thank you for being part of our journey. ✨',
    perks: [
      { label: '+1 day leave gift 🎁', icon: 'gift' },
      { label: 'Lounge access', icon: 'sparkles' },
    ],
    wishesCount: 12,
  });
});

app.get('/v1/card/me', (_req, res) => {
  send(res, {
    fullName: 'Elvina Martis',
    jobTitle: 'Technology Experience Specialist',
    organization: 'Emirates Group',
    employeeId: '624579',
    email: 'e.martis@emirates.com',
    phone: '+971 50 123 4567',
    qrPayload: 'EK-624579-STD',
    tier: 'standard',
  });
});

// v2 of the leave endpoint includes a `pending` field that v1 didn't.
app.get('/v1/leave/balance', (_req, res) => {
  send(res, { total: 30, used: 12, pending: 0, unit: 'days' }, 'v1');
});
app.get('/v2/leave/balance', (_req, res) => {
  send(res, { total: 30, used: 12, pending: 3, unit: 'days' }, 'v2');
});

app.get('/v1/attendance/today', (_req, res) => {
  send(res, {
    checkedIn: true,
    checkInAt: new Date(new Date().setHours(8, 48, 0, 0)).toISOString(),
    todayDurationMinutes: 372, // 6h 12m
    weeklyTargetMinutes: 40 * 60,
    weeklyActualMinutes: 38.5 * 60,
  });
});

app.get('/v1/payslip/latest', (_req, res) => {
  send(res, {
    currency: 'AED',
    netAmount: 24850,
    monthLabel: 'April 2026',
    creditedAt: '2026-04-28T08:00:00Z',
    delta: { amount: 1200, direction: 'up' },
  });
});

app.get('/v1/timesheet/week', (_req, res) => {
  send(res, {
    weekHours: 38.5,
    weekTarget: 40,
    daysWorked: 5,
    daysInWeek: 7,
  });
});

app.get('/v1/documents/next-expiry', (_req, res) => {
  send(res, {
    daysUntilExpiry: 92,
    documentLabel: 'Passport expiring',
    expiryDate: 'Aug 2026',
    documentNumber: 'GB1234567',
    status: 'renew_soon',
  });
});

app.get('/v1/applications/summary', (_req, res) => {
  send(res, {
    activeCount: 2,
    topApplication: {
      title: 'Senior Tech Experience Lead',
      status: 'interview',
    },
  });
});

app.get('/v1/appreciations/latest', (_req, res) => {
  send(res, {
    newThisMonth: 3,
    latest: {
      quote: 'Outstanding service recovery on EK202 — a true ambassador.',
      author: 'Capt. Khan',
      role: 'Pilot',
      daysAgo: 2,
    },
    tags: ['Star', 'Hero', 'Service'],
  });
});

app.get('/v1/trips/next', (_req, res) => {
  send(res, {
    travelType: 'ID90',
    date: '23 MAY',
    origin: 'DXB',
    destination: 'BKK',
    departureTime: '02:45',
    arrivalTime: '12:55',
    seat: '24A',
    bookingRef: '2X9JLM',
    flightNumber: 'EK 0418',
    duration: '6h 10m',
    gate: 'A12',
    terminal: '3',
    status: 'on_time',
  });
});

app.get('/v1/roster/week', (_req, res) => {
  send(res, {
    weekLabel: 'Week of May 12',
    duties: [
      {
        dayLabel: 'MON',
        dayNumber: '12',
        type: 'flight',
        origin: 'DXB',
        destination: 'JFK',
        flightNumber: 'EK 0202',
        duration: '14h 10m',
        role: 'Cabin Crew',
      },
      {
        dayLabel: 'WED',
        dayNumber: '14',
        type: 'flight',
        origin: 'JFK',
        destination: 'DXB',
        flightNumber: 'EK 0203',
        duration: '12h 05m',
        role: 'Cabin Crew',
      },
      {
        dayLabel: 'FRI',
        dayNumber: '16',
        type: 'flight',
        origin: 'DXB',
        destination: 'LHR',
        flightNumber: 'EK 0411',
        duration: '7h 25m',
        role: 'Cabin Crew',
      },
      {
        dayLabel: 'SUN',
        dayNumber: '18',
        type: 'off',
        status: 'Off Duty',
        note: 'Rest day',
      },
    ],
  });
});

// ─── Catch-all ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No mock handler for ${req.method} ${req.path}` },
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🟢 MyEK mock backend listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`   Set API_BASE_URL=http://10.0.2.2:${PORT} (Android emulator) or http://localhost:${PORT} (iOS sim)`);
});
