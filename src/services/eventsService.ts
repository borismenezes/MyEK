import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { EventsPayload } from '@/types';

const log = createLogger('Service/Events');

/**
 * Fetches the day's celebrations / events for the signed-in employee.
 * The EventBannerWidget consumer is responsible for filtering events to the
 * device's local date and hiding itself when nothing matches today.
 */
async function fetchEvents(employeeId: string): Promise<EventsPayload> {
  if (!employeeId) throw new Error('eventsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.events, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<EventsPayload>(path);
  return res.data;
}

export const eventsService = {
  fetch: fetchEvents,
};
