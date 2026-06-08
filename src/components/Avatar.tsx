import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';

/** Derive up-to-two-letter initials from a display name. */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  size?: number;
  /** Adds an extra red glow halo on top of the always-on red border. */
  ring?: boolean;
  name?: string;
}

/**
 * Single Avatar component used everywhere a profile photo appears (home
 * header, profile screen, business card, employee ID, platinum back).
 *
 *  - Reads the cached photo from `useAuthStore.photo`. If present, renders
 *    it as an `<Image>` from a `data:<mime>;base64,<bytes>` URI.
 *  - Falls back to a stylised SVG silhouette when no photo is cached.
 *  - Always wraps the image in a thin red border (matches the brand red).
 *  - `ring` adds an extra red shadow halo for emphasis (used in the home
 *    header and the profile screen).
 *
 * The actual photo bytes live in a single source-of-truth on the auth
 * store, populated once per session by `authService.loadProfilePicture()`
 * with stale-while-revalidate caching to MMKV — see authService.ts.
 */
export const Avatar: React.FC<AvatarProps> = ({ size = 44, ring = false, name }) => {
  const theme = useTheme();
  const photo = useAuthStore(s => s.photo);
  const user = useAuthStore(s => s.user);

  const hasPhoto = !!photo && photo.base64.length > 0;
  const photoUri = hasPhoto ? `data:${photo.mimeType};base64,${photo.base64}` : null;

  // Professional default when there's no photo: initials on the brand red,
  // the same convention Microsoft Teams / Outlook use. Personalised and
  // gender-neutral — unlike a single bundled headshot or a cartoon silhouette.
  const initials = useMemo(() => {
    const source = name ?? (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}` : '');
    return initialsFromName(source);
  }, [name, user]);

  const haloStyle = ring
    ? {
        shadowColor: theme.colors.ekRed,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 4,
        elevation: 0,
      }
    : null;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          // Brand-red fill backs the initials monogram; covered by the photo
          // when one is present.
          backgroundColor: theme.colors.ekRed,
          alignItems: 'center',
          justifyContent: 'center',
          // Always-on thin red border per the design system. Stays visible
          // whether the photo is loaded or the monogram is rendering.
          borderWidth: 1.5,
          borderColor: theme.colors.ekRed,
        },
        haloStyle,
      ]}
      accessibilityRole="image">
      {hasPhoto && photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Text
          allowFontScaling={false}
          style={{
            color: 'white',
            fontWeight: '700',
            // Scale the initials to the avatar; tuned so 2 letters sit
            // comfortably inside the circle at every size it's used (44–96).
            fontSize: Math.round(size * 0.4),
            letterSpacing: 0.5,
            includeFontPadding: false,
          }}>
          {initials || '·'}
        </Text>
      )}
    </View>
  );
};
