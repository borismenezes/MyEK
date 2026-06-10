import type { WidgetComponent } from '../types';
import { TimesheetWidget } from './TimesheetWidget';
const widgets: Record<string, WidgetComponent> = { timesheet: TimesheetWidget };
export default widgets;
