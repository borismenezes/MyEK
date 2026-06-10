import type React from 'react';

/** Local mirror of the host widget contract (until @myek/shared-types is extracted). */
export interface WidgetConfig {
  size?: 'small' | 'medium' | 'large';
  [key: string]: unknown;
}

export interface WidgetProps<T = unknown> {
  config: WidgetConfig;
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  onRefresh: () => void;
  preview?: boolean;
}

export type WidgetComponent = React.ComponentType<WidgetProps<any>>;

export interface AttendancePayload {
  checkedIn: boolean;
  checkInAt?: string; // ISO
  todayDurationMinutes: number;
  weeklyTargetMinutes: number;
  weeklyActualMinutes: number;
}
