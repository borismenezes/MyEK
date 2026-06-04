import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { TimesheetDetailsPayload } from '@/types';

const log = createLogger('Service/TimesheetDetails');

async function fetchTimesheetDetails(employeeId: string): Promise<TimesheetDetailsPayload> {
  if (!employeeId) throw new Error('timesheetDetailsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.timesheetDetails, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<TimesheetDetailsPayload>(path);
  return res.data;
}

export const timesheetDetailsService = {
  fetch: fetchTimesheetDetails,
};
