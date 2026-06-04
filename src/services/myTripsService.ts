import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { MyTripsPayload } from '@/types';

const log = createLogger('Service/MyTrips');

async function fetchMyTrips(employeeId: string): Promise<MyTripsPayload> {
  if (!employeeId) throw new Error('myTripsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.myTrips, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<MyTripsPayload>(path);
  return res.data;
}

export const myTripsService = {
  fetch: fetchMyTrips,
};
