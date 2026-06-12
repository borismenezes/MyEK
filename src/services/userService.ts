import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { User } from '@/types';

const log = createLogger('Service/User');

/**
 * Fetches the signed-in user's full profile from the Emirates HR API.
 *
 * Hits `GET ${APIM_BASE_URL}${APIM_PATH_USER_PROFILE}` with the employee id
 * substituted into the path; the Bearer is attached by `apimClient`. This is
 * the source for the EK-specific fields Graph `/me` doesn't carry (grade,
 * eligibilities, joinedAt).
 *
 * Returns `null` on any failure — NOT the bundled demo persona. The caller
 * merges a successful result over the existing user, so a failed fetch must
 * leave the real signed-in identity untouched rather than overwrite it with
 * static demo data (the previous behaviour silently replaced the real user with
 * "Elvina Martis" whenever this endpoint 404'd).
 *
 * Called once after sign-in / hydrate by `authService`. UI components read the
 * store; they should not call this service directly.
 */
async function fetchProfile(employeeId: string): Promise<User | null> {
  if (!employeeId) {
    log.warn('fetchProfile: no employeeId — keeping current identity');
    return null;
  }
  try {
    const path = buildPath(config.apim.paths.userProfile, { employeeId });
    log.debug(`GET ${path}`);
    const res = await apimClient().get<User>(path);
    return res.data ?? null;
  } catch (e) {
    log.warn('HR profile fetch failed — keeping current identity', e);
    return null;
  }
}

export const userService = {
  fetch: fetchProfile,
};
