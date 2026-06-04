import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import userDefault from './defaults/user.json';
import type { User } from '@/types';

const log = createLogger('Service/User');

/**
 * Fetches the signed-in user's full profile from APIM.
 *
 * Hits `GET ${APIM_BASE_URL}${APIM_PATH_USER_PROFILE}` with the employee id
 * substituted into the path. The Bearer + subscription key are attached by
 * `apimClient`. Falls back to the bundled default in `defaults/user.json` on
 * any failure so screens that depend on `user` (header, ID card, etc.) keep
 * rendering instead of going blank.
 *
 * Called once after sign-in / hydrate by `authService` to refresh the cached
 * profile in `useAuthStore`. UI components read from the store; they should
 * not call this service directly.
 */
async function fetchProfile(employeeId: string): Promise<User> {
  if (!employeeId) {
    log.warn('fetchProfile: no employeeId — using bundled default');
    return userDefault as User;
  }
  try {
    const path = buildPath(config.apim.paths.userProfile, { employeeId });
    log.debug(`GET ${path}`);
    const res = await apimClient().get<User>(path);
    return res.data;
  } catch (e) {
    log.warn('Profile fetch failed — using bundled default', e);
    return userDefault as User;
  }
}

export const userService = {
  fetch: fetchProfile,
};
