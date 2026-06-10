import { useEffect } from 'react';
import { useAuthStore } from '@store/useAuthStore';
import { useUIStore } from '@store/useUIStore';
import { setOpenProfile, setPlatformUser } from '@myek/platform';

/**
 * Publishes host state (signed-in user + the open-profile action) onto the
 * @myek/platform globalThis slots so federated remotes (e.g. the business-card
 * tile) can read the logged-in identity and open the profile sheet — without
 * importing host stores. Renders nothing; mount once inside the authenticated
 * tree. Keep in sync with the Avatar's data-URI construction.
 */
export function PlatformBridge(): null {
  const user = useAuthStore(s => s.user);
  const photo = useAuthStore(s => s.photo);
  const openIdSheet = useUIStore(s => s.setIdSheetVisible);

  useEffect(() => {
    setPlatformUser(
      user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            photoUri: photo && photo.base64 ? `data:${photo.mimeType};base64,${photo.base64}` : undefined,
          }
        : null,
    );
  }, [user, photo]);

  useEffect(() => {
    setOpenProfile(() => openIdSheet(true));
    return () => setOpenProfile(null);
  }, [openIdSheet]);

  return null;
}
