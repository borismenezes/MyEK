import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { LeaveDetailsPayload } from '@/types';

const log = createLogger('Service/LeaveDetails');

async function fetchLeaveDetails(employeeId: string): Promise<LeaveDetailsPayload> {
  if (!employeeId) throw new Error('leaveDetailsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.leaveDetails, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<LeaveDetailsPayload>(path);
  return res.data;
}

export const leaveDetailsService = {
  fetch: fetchLeaveDetails,
};
