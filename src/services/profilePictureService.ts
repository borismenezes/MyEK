import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { useAuthStore } from '@store/useAuthStore';
import { createLogger } from '@utils/logger';
import profilePictureDefault from './defaults/profilePicture.json';
import type { ProfilePicture } from '@/types';

const log = createLogger('Service/ProfilePicture');

/**
 * Fetches the signed-in user's profile photo as base64.
 *
 * Backed by APIM (`/hr/myek/employee/profile/widget/{employeeId}`). The API
 * token is acquired separately from sign-in via the apimClient. Falls back
 * to the bundled default (an empty base64 + `image/png` mime) on any failure
 * — Avatar renders its SVG silhouette in that case, so the UI never blanks.
 *
 * Called **exactly once per session** by `authService.signIn` and
 * `authService.hydrateAuth`, which stash the result on the auth store; every
 * Avatar reads from there. No widget should call this service directly.
 */
async function fetchProfilePicture(): Promise<ProfilePicture> {
  const employeeId = useAuthStore.getState().user?.employeeId;
  if (!employeeId) {
    log.warn('No signed-in employeeId — using bundled default');
    return profilePictureDefault as ProfilePicture;
  }
  try {
    const path = buildPath(config.apim.paths.profilePicture, { employeeId });
    const res = await apimClient().get<ProfilePicture>(path);
    return res.data;
  } catch (e) {
    log.warn('Profile picture fetch failed — using bundled default', e);
    return profilePictureDefault as ProfilePicture;
  }
}

export const profilePictureService = {
  fetch: fetchProfilePicture,
};
