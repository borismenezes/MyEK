import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { AttendanceWeekPayload } from '@/types';

const log = createLogger('Service/AttendanceDetails');

async function fetchAttendanceWeek(employeeId: string): Promise<AttendanceWeekPayload> {
  if (!employeeId) throw new Error('attendanceDetailsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.attendanceDetails, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<AttendanceWeekPayload>(path);
  return res.data;
}

export const attendanceDetailsService = {
  fetch: fetchAttendanceWeek,
};
