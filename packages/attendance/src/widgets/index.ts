import type { WidgetExposeMap } from '@myek/sdk';
import { AttendanceWidget } from './AttendanceWidget';

/** Widgets exposed by the `attendance` remote, keyed by widgetId. */
const widgets: WidgetExposeMap = {
  attendance: AttendanceWidget,
};

export default widgets;
