import { createLogger } from '@utils/logger';
import applicationsDefault from './defaults/applications.json';
import type { ApplicationsPayload } from '@/types';

const log = createLogger('Service/Applications');

/**
 * Fetches the user's internal job-application activity.
 * Stub returns the bundled default after a short delay; replace with a real
 * `apiClient.get('/v1/applications/summary')` when the backend is available.
 */
async function fetchApplications(): Promise<ApplicationsPayload> {
  log.debug('Fetching applications');
  await new Promise(resolve => setTimeout(resolve, 250));
  return applicationsDefault as ApplicationsPayload;
}

export const applicationsService = {
  fetch: fetchApplications,
};
