import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { LeaveBalancePayload } from '@/types';

const log = createLogger('Service/Leave');

async function fetchLeaveWidget(employeeId: string): Promise<LeaveBalancePayload> {
  if (!employeeId) throw new Error('leaveService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.leave, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<LeaveBalancePayload>(path);
  return res.data;
}

export const leaveService = {
  fetch: fetchLeaveWidget,
};
