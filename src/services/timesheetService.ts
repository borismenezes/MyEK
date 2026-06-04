import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { TimesheetPayload } from '@/types';

const log = createLogger('Service/Timesheet');

async function fetchTimesheet(employeeId: string): Promise<TimesheetPayload> {
  if (!employeeId) throw new Error('timesheetService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.timesheet, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<TimesheetPayload>(path);
  return res.data;
}

export const timesheetService = {
  fetch: fetchTimesheet,
};
