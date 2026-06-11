import { useEffect } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuthStore } from '@store/useAuthStore';
import { useUIStore } from '@store/useUIStore';
import {
  setActiveTheme,
  setCopyToClipboard,
  setOpenProfile,
  setPlatformUser,
  type PlatformTheme,
} from '@myek/platform';
import { useTheme } from '@/theme';

/**
 * Publishes host state (signed-in user + the open-profile action + the active
 * light/dark theme) onto the @myek/platform globalThis slots so federated
 * remotes (e.g. the business-card tile) can read the logged-in identity, open
 * the profile sheet, and match the host's theme — without importing host stores
 * or the host's React ThemeContext. Renders nothing; mount once inside the
 * authenticated tree, under ThemeProvider. Keep in sync with the Avatar's
 * data-URI construction.
 */
export function PlatformBridge(): null {
  const user = useAuthStore(s => s.user);
  const photo = useAuthStore(s => s.photo);
  const openIdSheet = useUIStore(s => s.setIdSheetVisible);
  const theme = useTheme();

  // Republish the active theme on every light/dark toggle so federated UI
  // (which reads it via @myek/ui's useTheme) re-renders in step with the host.
  useEffect(() => {
    setActiveTheme(theme as unknown as PlatformTheme);
  }, [theme]);

  useEffect(() => {
    setPlatformUser(
      user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            jobTitle: user.jobTitle,
            organization: 'Emirates Group',
            employeeId: user.employeeId,
            phone: user.phone,
            photoUri: photo && photo.base64 ? `data:${photo.mimeType};base64,${photo.base64}` : undefined,
          }
        : null,
    );
  }, [user, photo]);

  useEffect(() => {
    setOpenProfile(() => openIdSheet(true));
    return () => setOpenProfile(null);
  }, [openIdSheet]);

  // Publish a copy action so remotes (the business card) can copy fields without
  // depending on the native clipboard module. Shows a short confirmation toast.
  useEffect(() => {
    setCopyToClipboard((text, label) => {
      if (!text) return;
      Clipboard.setString(text);
      const msg = label ? `${label} copied` : 'Copied';
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    });
    return () => setCopyToClipboard(null);
  }, []);

  return null;
}
