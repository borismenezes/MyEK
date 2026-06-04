import applications from './applications.json';
import appreciations from './appreciations.json';
import attendance from './attendance.json';
import birthday from './birthday.json';
import businessCard from './businessCard.json';
import documents from './documents.json';
import events from './events.json';
import jiraTickets from './jiraTickets.json';
import leave from './leave.json';
import myTrips from './myTrips.json';
import outlookMeetings from './outlookMeetings.json';
import payslip from './payslip.json';
import roster from './roster.json';
import timesheet from './timesheet.json';

/**
 * Per-widget default payloads, keyed by `WidgetConfig.widgetId`.
 *
 * Used by the widget service as a last-resort fallback so the home grid
 * never renders empty when both cache and network are unavailable (e.g.
 * cold start while offline, or before the mock backend comes up).
 */
export const widgetDefaults: Record<string, unknown> = {
  applications,
  appreciations,
  attendance,
  birthday,
  businessCard,
  documents,
  events,
  jiraTickets,
  leave,
  myTrips,
  outlookMeetings,
  payslip,
  roster,
  timesheet,
};
