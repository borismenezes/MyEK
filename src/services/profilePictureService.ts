import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { useAuthStore } from '@store/useAuthStore';
import { createLogger } from '@utils/logger';
import type { ProfilePicture } from '@/types';

const log = createLogger('Service/ProfilePicture');

// No-photo sentinel. When no real photo is available we return this instead of
// a shared stock headshot, so every Avatar falls back to the user's initials
// monogram (the professional, per-user default).
const EMPTY_PHOTO: ProfilePicture = { base64: '', mimeType: 'image/png' };

/**
 * Fetches the signed-in user's profile photo as base64.
 *
 * Backed by APIM (`/hr/myek/employee/profile/widget/{employeeId}`). The API
 * token is acquired separately from sign-in via the apimClient. Returns an
 * empty photo on any failure — Avatar renders the initials monogram in that
 * case, so the UI never blanks and no user wears another person's face.
 *
 * Called **exactly once per session** by `authService.signIn` and
 * `authService.hydrateAuth`, which stash the result on the auth store; every
 * Avatar reads from there. No widget should call this service directly.
 */
async function fetchProfilePicture(): Promise<ProfilePicture> {
  const employeeId = useAuthStore.getState().user?.employeeId;
  if (!employeeId) {
    log.warn('No signed-in employeeId — no photo; Avatar shows initials');
    return EMPTY_PHOTO;
  }
  try {
    const path = buildPath(config.apim.paths.profilePicture, { employeeId });
    const res = await apimClient().get<ProfilePicture>(path);
    return res.data?.base64 ? res.data : EMPTY_PHOTO;
  } catch (e) {
    log.warn('Profile picture fetch failed — no photo; Avatar shows initials', e);
    return EMPTY_PHOTO;
  }
}

export const profilePictureService = {
  fetch: fetchProfilePicture,
};
