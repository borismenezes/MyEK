import type { AppDetailLayout, AppManifestEntry } from '@/types';
import { LeaveDetailLayout } from './LeaveDetailLayout';
import { PlatinumVouchersDetailLayout } from './PlatinumVouchersDetailLayout';
import { AttendanceDetailLayout } from './AttendanceDetailLayout';
import { TimesheetDetailLayout } from './TimesheetDetailLayout';

/**
 * Props every detail-layout component receives. The dispatcher passes the
 * manifest entry through verbatim so layouts can read endpoint, applicationName,
 * etc. directly without a second lookup.
 */
export interface DetailLayoutProps {
  entry: AppManifestEntry;
}

/**
 * Map of detail-layout key → renderer.
 *
 * Adding a new detail surface for an app is a manifest change plus one
 * registry entry here — no per-screen wiring required. The DetailScreen
 * dispatcher reads `manifest.detail.layout` for the targeted app and
 * renders the matching component.
 */
export const DetailLayoutRegistry: Record<AppDetailLayout, React.FC<DetailLayoutProps>> = {
  list: LeaveDetailLayout,
  vouchers: PlatinumVouchersDetailLayout,
  attendanceWeek: AttendanceDetailLayout,
  timesheetLog: TimesheetDetailLayout,
};
