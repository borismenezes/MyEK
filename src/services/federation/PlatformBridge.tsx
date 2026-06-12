import { useEffect } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuthStore } from '@store/useAuthStore';
import { useUIStore } from '@store/useUIStore';
import {
  publishBridgeProtocol,
  registerHostActions,
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

  // Declare which bridge protocol this shell speaks, before any slot is
  // populated — remotes compare it against their compiled-in copy
  // (checkBridgeProtocol) to catch contract drift instead of failing silently.
  useEffect(() => {
    publishBridgeProtocol();
  }, []);

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
            staffId: user.staffId,
            phone: user.phone,
            photoUri: photo && photo.base64 ? `data:${photo.mimeType};base64,${photo.base64}` : undefined,
          }
        : null,
    );
  }, [user, photo]);

  // Host actions: the typed registry (hostAction) is the canonical surface;
  // the legacy per-action slots are populated with the SAME handlers so
  // already-published remote bundles (which read those slots) keep working.
  // A new shell capability = one entry in this map + its payload type in
  // @myek/sdk — never a new bespoke slot.
  useEffect(() => {
    const openProfile = (): void => openIdSheet(true);
    const copyToClipboard = (payload: { text: string; label?: string }): void => {
      if (!payload?.text) return;
      Clipboard.setString(payload.text);
      const msg = payload.label ? `${payload.label} copied` : 'Copied';
      // The copy action carries its own feedback so remotes don't each
      // invent one. iOS shows none (system convention); Android toasts.
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    };

    registerHostActions({ openProfile, copyToClipboard });
    setOpenProfile(openProfile);
    setCopyToClipboard((text, label) => copyToClipboard({ text, label }));
    return () => {
      registerHostActions(null);
      setOpenProfile(null);
      setCopyToClipboard(null);
    };
  }, [openIdSheet]);

  return null;
}
