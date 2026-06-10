import type React from 'react';

/**
 * Local mirror of the host's widget contract (src/types/widgets.ts). Duplicated
 * here so the remote doesn't import host `src/*`. When @myek/shared-types is
 * extracted, these move there and both sides import the singleton.
 */
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

export interface LeaveBalancePayload {
  total: number;
  used: number;
  pending: number;
  unit: 'days';
}
