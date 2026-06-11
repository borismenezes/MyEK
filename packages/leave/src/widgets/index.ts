import type { WidgetExposeMap } from '@myek/sdk';
import { LeaveBalanceWidget } from './LeaveBalanceWidget';

/**
 * Widgets exposed by the `leave` remote, keyed by widgetId. The host merges
 * this map into its widget registry (federated as `./widgets`).
 */
const widgets: WidgetExposeMap = {
  leave: LeaveBalanceWidget,
};

export default widgets;
