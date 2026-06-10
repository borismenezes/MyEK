import type { WidgetComponent } from '../types';
import { AttendanceWidget } from './AttendanceWidget';

/** Widgets exposed by the `attendance` remote, keyed by widgetId. */
const widgets: Record<string, WidgetComponent> = {
  attendance: AttendanceWidget,
};

export default widgets;
