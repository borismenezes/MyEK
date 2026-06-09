import type { ApiVersion } from './api';

/**
 * Widget size on the home grid. Mirrors iOS widget sizing conventions:
 *  - small  → 1 column (square)
 *  - medium → 2 columns × 1 row
 *  - large  → 2 columns × 2 rows
 */
export type WidgetSize = 'small' | 'medium' | 'large';

/**
 * The server returns a list of WidgetConfig for the user's home layout.
 * The widgetId is used to look up the component in the WidgetRegistry.
 *
 * `appName`: when set, the widget fetches its data via the generic
 * `appDataService.fetch(appName)` route instead of hitting `endpoint`
 * directly. This decouples reusable widget templates (BalanceMeterWidget,
 * MetricCardWidget, …) from the specific application they're rendering
 * for. `endpoint` remains as a backward-compat fallback so widgets can
 * be migrated incrementally.
 *
 * `applicationName`: the human-readable label displayed in the widget's
 * header (e.g. "Leave Balance"). Sourced from the applications manifest
 * so the same template can serve multiple apps with different headers.
 * Each widget falls back to its own legacy hard-coded label if absent.
 */
export interface WidgetConfig {
  widgetId: string;
  apiVersion: ApiVersion;
  endpoint: string;
  layout: { size: WidgetSize };
  refreshIntervalMs?: number;
  /** Optional per-widget params merged into the request, e.g. { period: 'month' } */
  params?: Record<string, string | number | boolean>;
  /** Permissions required to render this widget */
  requiredPermissions?: string[];
  /**
   * Application identifier this widget visualises (e.g. 'leave', 'payslip').
   * Drives the per-app data fetch; absent → use `endpoint` directly.
   */
  appName?: string;
  /**
   * Human-readable header label, e.g. "Leave Balance". When present,
   * widgets use this in place of their built-in hard-coded label.
   */
  applicationName?: string;
}

/**
 * What the applications-manifest service returns for each app the user has
 * access to. Drives the home layout: which widgets to show, in what size,
 * and whether they're currently enabled.
 *
 * The server is the source of truth — the app uses this to build the
 * default layout on first install (and any time the user resets it).
 *
 * Three names appear here, all distinct:
 *   - `appName`         — stable technical identifier passed to services
 *   - `applicationName` — human-readable header label rendered in the tile
 *   - `widgetName`      — template/visual to render (matches WidgetRegistry key)
 */
export interface AppManifestEntry {
  /** Stable application identifier passed to services, e.g. 'leave'. */
  appName: string;
  /** Human-readable label rendered as the widget's header, e.g. "Leave Balance". */
  applicationName: string;
  /** Widget template to render for this app — must match a WidgetRegistry key. */
  widgetName: string;
  /** Icon name from the Icon component — used by the Services tab list. */
  icon: string;
  /** Default size when the widget is first added to the home grid. */
  defaultSize: WidgetSize;
  /** Whether the app is enabled for this user. Disabled apps are filtered out. */
  enabled: boolean;
  /**
   * Whether the app should appear in the Services tab list. Apps that are
   * widget-only (events banner, jira tickets, …) leave this `false`.
   */
  showInServices: boolean;
  /**
   * Whether the widget should appear on the default home grid. Apps that are
   * detail-only (`platinumVouchers`) leave this `false`; they still surface
   * in the Services tab when `showInServices` is `true`.
   */
  showOnHome: boolean;
  /** Optional API binding — falls back to the WidgetRegistry entry if absent. */
  apiVersion?: ApiVersion;
  endpoint?: string;
  /**
   * Optional detail-screen configuration. When present, tapping the app's
   * widget on the home grid (or the app's row in the Services tab) opens a
   * detail screen. `layout` selects which renderer in the DetailLayoutRegistry
   * to use; `endpoint`/`apiVersion` describe where the detail payload comes
   * from. Absent → no detail surface for that app.
   */
  detail?: AppDetailConfig;
}

/**
 * Drives the detail-screen layer. New layouts are added by registering a
 * renderer keyed by `layout` in `screens/detail/DetailLayoutRegistry`, and
 * referenced from the manifest entry — no per-app screen wiring required.
 */
export type AppDetailLayout = 'list' | 'attendanceWeek' | 'timesheetLog';

/** A single line item billed against a story / Jira / taxonomy. */
export interface TimesheetEntry {
  /** Stable id — used as the React key. */
  id: string;
  /** Headline / story title — e.g. "MYEK-1234 · Wire leave widget". */
  story: string;
  /** Workstream classification — e.g. "Engineering · Bugfix" or "Meeting". */
  taxonomy: string;
  /** Decimal hours billed on this entry, e.g. 3.5. */
  hours: number;
}

export interface TimesheetDayRecord {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  isBusinessDay: boolean;
  /** Pre-aggregated by the server. UI doesn't recompute. */
  totalHours: number;
  /** Zero or more line items. Ordered by the server (typically chronological). */
  entries: TimesheetEntry[];
}

/** Single line item in the payments or deductions section. */
export interface PayslipLineItem {
  label: string;
  amount: number;
}

/**
 * Full payslip document, rendered inside the bottom-sheet view.
 *
 * `employeeName` / `employeeNumber` are typically overridden at render-time
 * with values from `useAuthStore.user` so the document reflects the
 * signed-in employee rather than the bundled placeholder.
 */
export interface PayslipDocumentPayload {
  /** Top centered banner, e.g. "PAY ADVICE FOR OCTOBER 2025". */
  periodLabel: string;
  employeeNumber: string;
  employeeName: string;
  position: string;
  organization: string;
  /** Date of joining — kept as a pre-formatted display string. */
  doj: string;
  grade: string;
  currency: string;
  payments: PayslipLineItem[];
  deductions: PayslipLineItem[];
  bankBranchName: string;
  accountNumber: string;
  /** Pre-computed net pay amount (payments total - deductions total). */
  netPayAmount: number;
  /** Footer message — usually leave balance or HR note. */
  message: string;
}

export interface TimesheetDetailsPayload {
  /** ISO date of the earliest day in the window. */
  rangeStartDate: string;
  /** ISO date of the latest day in the window (today). */
  rangeEndDate: string;
  /** Expected billable hours per business day, e.g. 8.5. */
  targetHoursPerDay: number;
  /** Sorted oldest → newest. Typically 14 entries (last fortnight). */
  days: TimesheetDayRecord[];
}

/** A single day in the weekly attendance view. */
export interface AttendanceDayRecord {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Mon, Tue, Wed, … — pre-computed by the server for display. */
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  /** Whether the calendar treats this day as a business day. Weekends + public
   *  holidays come through with `isBusinessDay: false` so the UI greys them. */
  isBusinessDay: boolean;
  /** ISO timestamp of the punch-in. Null when the employee didn't check in. */
  inTime: string | null;
  /** ISO timestamp of the punch-out. Null when still checked in or absent. */
  outTime: string | null;
  /** Minutes worked on this day. 0 for absent / weekend. */
  workedMinutes: number;
}

/**
 * Jira-ticket summary surfaced on the home grid.
 *
 * `total` is the count of currently-open tickets assigned to the signed-in
 * user; `byStatus` groups that total by workflow stage so the small tile
 * can render a glanceable breakdown without listing individual tickets.
 */
export interface JiraTicketsPayload {
  total: number;
  byStatus: {
    todo: number;
    inProgress: number;
    blocked: number;
  };
}

/** A single calendar entry surfaced on the home grid. */
export interface OutlookMeeting {
  /** Stable id — used as the React key. */
  id: string;
  /** Display title of the meeting. */
  title: string;
  /** ISO timestamp the meeting starts. */
  startAt: string;
  /** ISO timestamp the meeting ends. */
  endAt: string;
  /** Optional room name / "Microsoft Teams" / physical location. */
  location?: string;
  /** Whether the calendar shows this slot as accepted / tentative / declined. */
  responseStatus?: 'accepted' | 'tentative' | 'declined' | 'organizer';
  /** True when the meeting is happening right now. Server-computed so the
   *  client doesn't have to clock-skew adjust against device time. */
  isInProgress?: boolean;
}

export interface OutlookMeetingsPayload {
  /** Pre-sorted ascending by start time. */
  meetings: OutlookMeeting[];
}

export interface AttendanceWeekPayload {
  /** ISO date of the week's Monday — anchors the header label. */
  weekStartDate: string;
  /** 7 entries, Monday → Sunday. */
  days: AttendanceDayRecord[];
}

export interface PlatinumVoucher {
  /** Stable id — used as the React key in the list. */
  id: string;
  /** Display name of the retailer (Lulu, Carrefour, Careem, Noon, …). */
  vendor: string;
  /** Face value of the voucher in `currency`. */
  amount: number;
  /** ISO 4217 code, e.g. `AED`. */
  currency: string;
  /** ISO date the voucher was bought with the Platinum card. */
  purchasedAt: string;
  /** ISO date after which the voucher can no longer be redeemed. */
  expiresAt: string;
  /** Optional redemption code shown to the user. */
  code?: string;
  status: 'active' | 'used' | 'expired';
}

export interface PlatinumVouchersPayload {
  vouchers: PlatinumVoucher[];
  /** Sum of `amount` for `status === 'active'` vouchers — used by the
   *  summary card. Server-computed so the client doesn't drift if the
   *  status enum grows. */
  totalActiveAmount: number;
  /** ISO 4217 code for the summary total. Per-voucher currency still wins
   *  when rendering individual cards. */
  currency: string;
}

export interface AppDetailConfig {
  /** Selects which detail layout renderer is used. */
  layout: AppDetailLayout;
  /** Endpoint that returns the detail payload. */
  endpoint?: string;
  apiVersion?: ApiVersion;
}

/**
 * AppConfig describes an internal sub-app the user has access to (e.g. Finance, Leave).
 * It bundles the widgets it exposes and the API version to use.
 */
export interface AppConfig {
  appId: string;
  name: string;
  icon: string;
  enabled: boolean;
  apiVersion: ApiVersion;
  widgets: WidgetConfig[];
}

/**
 * Common props every widget receives.
 * data / loading / error are wired by the WidgetRenderer; widgets stay pure.
 */
export interface WidgetProps<T = unknown> {
  config: WidgetConfig;
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  onRefresh: () => void;
  /**
   * True when the widget is rendered inside the edit drawer's preview
   * stack. Widgets that hide themselves on the home grid based on a
   * date / freshness check (e.g. EventBannerWidget) should suppress
   * that filter here so the user always sees a representative tile.
   */
  preview?: boolean;
}

/* ─────────────────────────────────────────────────────────────
 * Strongly-typed payloads for the example widgets.
 * Each widget owns its own data shape; the WidgetRenderer is generic.
 * ────────────────────────────────────────────────────────────*/

export interface BirthdayPayload {
  name: string;
  message: string;
  perks: { label: string; icon: string }[];
  wishesCount: number;
}

/**
 * Event kinds the EventBannerWidget knows how to style. Adding a new kind
 * is a two-step change: extend this union, then add a `gradient` /
 * `headerIcon` mapping inside EventBannerWidget.
 */
export type EventKind = 'birthday' | 'newYear' | 'anniversary' | 'holiday' | 'company';

export interface EventItem {
  /** Stable id — used as the React key during stack-rotation. */
  id: string;
  kind: EventKind;
  /** Calendar date the event is valid for, in `YYYY-MM-DD`. The widget
   *  hides itself on the home grid when no event matches the device's
   *  local date. */
  date: string;
  /** Headline shown on the front of the card — e.g. "Happy Birthday, Sara!". */
  title: string;
  /** Optional body copy shown below the headline. */
  message?: string;
  /** Optional override for the card's background colour. When set, the
   *  widget paints the card in this solid colour instead of the kind-based
   *  gradient. Accepts any valid CSS colour string (e.g. `#C60C30`). */
  color?: string;
  /** Optional pill-style perks rendered inline. */
  perks?: { label: string; icon: string }[];
}

export interface EventsPayload {
  events: EventItem[];
}

export interface BusinessCardPayload {
  fullName: string;
  jobTitle: string;
  organization: string;
  employeeId: string;
  email: string;
  phone: string;
  qrPayload: string; // value to encode
  tier: 'standard' | 'platinum';
}

export interface PlatinumCardPayload {
  fullName: string;
  jobTitle: string;
  organization: string;
  department: string;
  memberId: string; // e.g. "6245 · 79PLT"
  memberSince: string; // year, e.g. "2019"
  validThru: string; // e.g. "12/28"
  tierLabel: string; // e.g. "EK · PLATINUM"
  tierBadge: string; // e.g. "EXECUTIVE TIER"
  qrPayload: string;
}

export interface LeaveBalancePayload {
  total: number;
  used: number;
  pending: number;
  unit: 'days';
}

export interface AttendancePayload {
  checkedIn: boolean;
  checkInAt?: string; // ISO
  todayDurationMinutes: number;
  weeklyTargetMinutes: number;
  weeklyActualMinutes: number;
}

/**
 * Payslip widget payload — visual is intentionally amount-free for shoulder-
 * surfing safety on the home grid. Only metadata about the latest available
 * payslip surfaces here; the full statement (with figures) lives behind a
 * detail screen / external app launch.
 */
export type PayslipStatus = 'available' | 'pending' | 'unavailable';

export interface PayslipPayload {
  monthLabel: string;       // e.g. "April 2026"
  creditedAt: string;       // ISO — used for the "credited X ago" caption
  status?: PayslipStatus;   // defaults to 'available' when absent
  /** @deprecated Retained for back-compat; the home widget no longer renders amounts. */
  currency?: string;
  /** @deprecated Retained for back-compat; the home widget no longer renders amounts. */
  netAmount?: number;
  /** @deprecated Retained for back-compat; the home widget no longer renders amounts. */
  delta?: { amount: number; direction: 'up' | 'down' };
}

export interface TimesheetPayload {
  weekHours: number; // e.g. 38.5
  weekTarget: number; // e.g. 40
  daysWorked: number; // count of days filled, e.g. 5
  daysInWeek: number; // e.g. 7
}

export type DocumentStatus = 'valid' | 'renew_soon' | 'expired';

export interface DocumentsPayload {
  daysUntilExpiry: number; // e.g. 92
  documentLabel: string; // e.g. "Passport expiring"
  expiryDate: string; // e.g. "Aug 2026"
  documentNumber: string; // e.g. "GB1234567"
  status: DocumentStatus;
}

export type ApplicationStatus = 'submitted' | 'interview' | 'offer' | 'rejected';

export interface ApplicationsPayload {
  activeCount: number;
  topApplication: {
    title: string;
    status: ApplicationStatus;
  };
}

export interface AppreciationsPayload {
  newThisMonth: number;
  latest: {
    quote: string;
    author: string;
    role: string;
    daysAgo: number;
  };
  tags: string[]; // e.g. ["Star", "Hero", "Service"]
}

export interface MyTripsPayload {
  travelType: string; // e.g. "ID90"
  date: string; // e.g. "23 MAY"
  origin: string; // IATA, e.g. "DXB"
  destination: string; // e.g. "BKK"
  departureTime: string; // e.g. "02:45"
  arrivalTime: string; // e.g. "12:55"
  seat: string; // e.g. "24A"
  bookingRef: string; // e.g. "2X9JLM"
  flightNumber?: string; // shown on the large variant
  duration?: string; // e.g. "6h 10m"
  gate?: string;
  terminal?: string;
  status?: 'on_time' | 'delayed' | 'boarding';
}

export type RosterDutyType = 'flight' | 'off';

export interface RosterDuty {
  dayLabel: string; // e.g. "MON"
  dayNumber: string; // e.g. "12"
  type: RosterDutyType;
  origin?: string;
  destination?: string;
  flightNumber?: string;
  duration?: string;
  role?: string;
  status?: string; // for off-duty rows: e.g. "Off Duty"
  note?: string; // e.g. "Rest day"
}

export interface RosterPayload {
  weekLabel: string; // e.g. "Week of May 12"
  duties: RosterDuty[];
}

export type LeaveStatus = 'approved' | 'rejected' | 'cancelled' | 'pending';

export interface LeaveItem {
  id: string;
  leaveType: string;       // e.g. "Annual", "Sick", "Compassionate"
  startDate: string;        // ISO yyyy-mm-dd
  endDate: string;          // ISO yyyy-mm-dd
  status: LeaveStatus;
  reason?: string;
}

export interface LeaveDetailsPayload {
  /** Same shape as the home-screen leave widget, reused for the summary card. */
  balance: LeaveBalancePayload;
  /** Convenience aggregate; the screen also derives this from `items`. */
  approvedCount: number;
  items: LeaveItem[];
}
