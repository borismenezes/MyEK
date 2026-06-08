import type React from 'react';
import type { ApiVersion, WidgetConfig, WidgetProps, WidgetSize } from '@/types';
// Generic, application-agnostic tile components. The mapping below pairs
// each business widgetId (the contract the server/app speak in) with one
// of these reusable templates. Originally these were named after the
// applications they served (LeaveWidget, PayslipWidget, …) — see the
// JSDoc inside each file for the original name.
import { CounterTileWidget } from './CounterTileWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';
import { EventBannerWidget } from './EventBannerWidget';
import { IdentityCardWidget } from './IdentityCardWidget';
import { CountdownTileWidget } from './CountdownTileWidget';
import { BalanceMeterWidget } from './BalanceMeterWidget';
import { OutlookMeetingsWidget } from './OutlookMeetingsWidget';
import { ProgressRingWidget } from './ProgressRingWidget';
import { JourneyCardWidget } from './JourneyCardWidget';
import { MetricCardWidget } from './MetricCardWidget';
import { ScheduleListWidget } from './ScheduleListWidget';
import { HoursProgressWidget } from './HoursProgressWidget';
import { JiraTicketsWidget } from './JiraTicketsWidget';


/**
 * Each registry entry pairs a widgetId with:
 *  - The component that renders it
 *  - Display metadata used by the "Add widget" picker
 *  - The list of sizes this widget supports
 *  - Whether the surface should be wrapped in a Card (false for full-bleed gradients)
 *  - A default API binding used when the user adds the widget from the edit drawer.
 */
export interface WidgetRegistryEntry {
  widgetId: string;
  name: string;
  description: string;
  icon: string;
  component: React.ComponentType<WidgetProps<any>>;
  supportedSizes: WidgetSize[];
  /** When false, the WidgetRenderer doesn't wrap the widget in a Card surface. */
  surface: boolean;
  /**
   * When true, the WidgetRenderer suppresses the amber stale chip on this
   * widget. Used for tiles where staleness is meaningless — e.g. the
   * business card carries identity data that doesn't really go stale, so
   * showing the indicator confuses users.
   */
  hideStaleIndicator?: boolean;
  /** API binding + initial size used when this widget is freshly added. */
  defaultConfig: {
    apiVersion: ApiVersion;
    endpoint: string;
    size: WidgetSize;
    refreshIntervalMs?: number;
  };
}

export const WidgetRegistry: Record<string, WidgetRegistryEntry> = {
  events: {
    widgetId: 'events',
    name: 'Today\'s Events',
    description: 'Birthdays, holidays and team celebrations for the day',
    icon: 'cake',
    component: EventBannerWidget,
    supportedSizes: ['small', 'large'],
    surface: false,
    defaultConfig: { apiVersion: 'v1', endpoint: '/events/today', size: 'large', refreshIntervalMs: 0 },
  },
  businessCard: {
    widgetId: 'businessCard',
    name: 'Business Card',
    description: 'Your digital identity',
    icon: 'card',
    component: IdentityCardWidget,
    supportedSizes: ['large'],
    surface: true,
    hideStaleIndicator: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/card/me', size: 'large' },
  },
  leave: {
    widgetId: 'leave',
    name: 'Leave Balance',
    description: 'Days remaining and used',
    icon: 'calendar',
    component: BalanceMeterWidget,
    supportedSizes: ['small', 'large'],
    surface: true,
    defaultConfig: { apiVersion: 'v2', endpoint: '/leave/balance', size: 'small' },
  },
  attendance: {
    widgetId: 'attendance',
    name: 'Attendance',
    description: 'Today and weekly progress',
    icon: 'clock',
    component: ProgressRingWidget,
    supportedSizes: ['small', 'large'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/attendance/today', size: 'small' },
  },
  payslip: {
    widgetId: 'payslip',
    name: 'Payslip',
    description: 'Latest payslip available — open the app for details',
    icon: 'wallet',
    component: MetricCardWidget,
    supportedSizes: ['small'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/payslip/latest', size: 'small' },
  },
  timesheet: {
    widgetId: 'timesheet',
    name: 'Timesheet',
    description: 'Hours logged this week',
    icon: 'timesheet',
    component: HoursProgressWidget,
    supportedSizes: ['small'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/timesheet/week', size: 'small' },
  },
  documents: {
    widgetId: 'documents',
    name: 'Documents',
    description: 'Next document to expire',
    icon: 'passport',
    component: CountdownTileWidget,
    supportedSizes: ['small'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/documents/next-expiry', size: 'small' },
  },
  applications: {
    widgetId: 'applications',
    name: 'Applications',
    description: 'Active internal job applications',
    icon: 'briefcase',
    component: CounterTileWidget,
    supportedSizes: ['small'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/applications/summary', size: 'small' },
  },
  appreciations: {
    widgetId: 'appreciations',
    name: 'Appreciations',
    description: 'Recent peer recognition',
    icon: 'medal',
    component: ActivityFeedWidget,
    supportedSizes: ['large'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/appreciations/latest', size: 'large' },
  },
  myTrips: {
    widgetId: 'myTrips',
    name: 'My Trips',
    description: 'Next personal trip / staff travel',
    icon: 'plane',
    component: JourneyCardWidget,
    // Large-only so My Trips renders at the same full-width dimensions as
    // Outlook Meetings / Roster / Appreciations on the home grid.
    supportedSizes: ['large'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/trips/next', size: 'large' },
  },
  roster: {
    widgetId: 'roster',
    name: 'Cabin Crew Roster',
    description: 'This week’s flight assignments',
    icon: 'roster',
    component: ScheduleListWidget,
    supportedSizes: ['large'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/roster/week', size: 'large' },
  },
  jiraTickets: {
    widgetId: 'jiraTickets',
    name: 'Jira Tickets',
    description: 'Open tickets assigned to you, grouped by status',
    icon: 'layers',
    component: JiraTicketsWidget,
    supportedSizes: ['small'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/jira/tickets', size: 'small' },
  },
  outlookMeetings: {
    widgetId: 'outlookMeetings',
    name: 'Outlook Meetings',
    description: 'Today\'s calendar at a glance',
    icon: 'meeting',
    component: OutlookMeetingsWidget,
    supportedSizes: ['large'],
    surface: true,
    defaultConfig: { apiVersion: 'v1', endpoint: '/outlook/meetings/today', size: 'large' },
  },
};

export function getRegistryEntry(widgetId: string): WidgetRegistryEntry | null {
  return WidgetRegistry[widgetId] ?? null;
}

const VALID_SIZES: ReadonlySet<WidgetSize> = new Set<WidgetSize>(['small', 'medium', 'large']);

/**
 * Resolve the size a widget should render at, guaranteeing the same heights as
 * the bundled (pre-backend-integration) layout regardless of what the live
 * manifest sends. The client owns widget presentation:
 *   1. honour a manifest size ONLY if it's valid AND one this widget supports,
 *   2. otherwise fall back to the registry's default size (the canonical value),
 *   3. final guard → 'small'.
 * This stops a backend that omits `defaultSize` (→ undefined) or sends an
 * unsupported value from collapsing/inflating a tile's height.
 */
export function resolveWidgetSize(raw: unknown, widgetId: string): WidgetSize {
  const entry = WidgetRegistry[widgetId];
  const fallback = entry?.defaultConfig.size ?? 'small';
  if (typeof raw === 'string' && VALID_SIZES.has(raw as WidgetSize)) {
    const size = raw as WidgetSize;
    if (!entry || entry.supportedSizes.includes(size)) return size;
  }
  return fallback;
}

/**
 * Default widget layout. Used as a last-resort fallback when:
 *  - The auth bootstrap returns an empty `widgetLayout`
 *  - The persisted layout cache is empty/corrupt
 *
 * Each entry's API binding comes straight from `WidgetRegistry[id].defaultConfig`,
 * so adding a widget here just requires it to exist in the registry.
 */
export const DEFAULT_LAYOUT_ORDER: string[] = [
  // `events` is first so today's celebrations land above the fold. The
  // widget self-hides on the home grid when no event matches today
  // (handled by HomeScreen's visibleLayout filter), so it costs nothing
  // on a quiet day — and on a celebratory day it greets the user
  // instantly without scrolling.
  'events',
  'businessCard',
  'leave',
  'attendance',
  'payslip',
  'timesheet',
  'outlookMeetings',
  'documents',
  'jiraTickets',
  'appreciations',
  'applications',
  'myTrips',
  'roster'
];

export const defaultWidgetLayout: WidgetConfig[] = DEFAULT_LAYOUT_ORDER.map(createWidgetConfig).filter(
  (c): c is WidgetConfig => c !== null,
);

/** Build a fresh WidgetConfig for the given widgetId from its registry default. */
export function createWidgetConfig(widgetId: string): WidgetConfig | null {
  const entry = WidgetRegistry[widgetId];
  if (!entry) return null;
  const { apiVersion, endpoint, size, refreshIntervalMs } = entry.defaultConfig;
  return {
    widgetId,
    apiVersion,
    endpoint,
    layout: { size },
    ...(refreshIntervalMs !== undefined ? { refreshIntervalMs } : {}),
  };
}
