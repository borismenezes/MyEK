/**
 * Widget contract comes from @myek/sdk — the cross-bundle type contract shared
 * with the host (compile-time only; types are erased). Payload types below are
 * this remote's own.
 */
export type { WidgetConfig, WidgetProps, WidgetComponent } from '@myek/sdk';

export interface LeaveBalancePayload {
  total: number;
  used: number;
  pending: number;
  unit: 'days';
}
