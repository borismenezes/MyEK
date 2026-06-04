import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { AppreciationsPayload } from '@/types';

const log = createLogger('Service/Appreciations');

async function fetchAppreciations(employeeId: string): Promise<AppreciationsPayload> {
  if (!employeeId) throw new Error('appreciationsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.appreciations, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<AppreciationsPayload>(path);
  return res.data;
}

export const appreciationsService = {
  fetch: fetchAppreciations,
};
