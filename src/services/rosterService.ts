import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { RosterPayload } from '@/types';

const log = createLogger('Service/Roster');

async function fetchRoster(employeeId: string): Promise<RosterPayload> {
  if (!employeeId) throw new Error('rosterService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.roster, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<RosterPayload>(path);
  return res.data;
}

export const rosterService = {
  fetch: fetchRoster,
};
