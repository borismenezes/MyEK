import type { WidgetComponent } from '../types';
import { LeaveBalanceWidget } from './LeaveBalanceWidget';

/**
 * Widgets exposed by the `leave` remote, keyed by widgetId. The host merges
 * this map into its widget registry (federated as `./widgets`).
 */
const widgets: Record<string, WidgetComponent> = {
  leave: LeaveBalanceWidget,
};

export default widgets;
