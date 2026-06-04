import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { BusinessCardPayload } from '@/types';

const log = createLogger('Service/BusinessCard');

async function fetchBusinessCard(employeeId: string): Promise<BusinessCardPayload> {
  if (!employeeId) throw new Error('businessCardService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.businessCard, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<BusinessCardPayload>(path);
  return res.data;
}

export const businessCardService = {
  fetch: fetchBusinessCard,
};
