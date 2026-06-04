import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { AttendancePayload } from '@/types';

const log = createLogger('Service/Attendance');

async function fetchAttendance(employeeId: string): Promise<AttendancePayload> {
  if (!employeeId) throw new Error('attendanceService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.attendance, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<AttendancePayload>(path);
  return res.data;
}

export const attendanceService = {
  fetch: fetchAttendance,
};
