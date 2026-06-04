import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';

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
export const Avatar: React.FC<AvatarProps> = ({ size = 44, ring = false }) => {
  const theme = useTheme();
  const photo = useAuthStore(s => s.photo);

  const hasPhoto = !!photo && photo.base64.length > 0;
  const photoUri = hasPhoto ? `data:${photo.mimeType};base64,${photo.base64}` : null;

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
          backgroundColor: '#D1D5DB',
          // Always-on thin red border per the design system. Stays visible
          // whether the photo is loaded or the silhouette is rendering.
          borderWidth: 1.5,
          borderColor: theme.colors.ekRed,
        },
        haloStyle,
      ]}
      accessibilityRole="image">
      {hasPhoto && photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          <Defs>
            <LinearGradient id="avg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#E5E7EB" />
              <Stop offset="100%" stopColor="#9CA3AF" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#avg)" />
          <Circle cx={50} cy={42} r={18} fill="#F3F4F6" />
          <Path d="M20 100 C 22 70, 78 70, 80 100 Z" fill="#F3F4F6" />
          <Path d="M32 36 Q 50 14 68 36 Q 70 30 50 22 Q 30 30 32 36 Z" fill="#4B5563" />
          <Circle cx={44} cy={44} r={2} fill="#1F2937" />
          <Circle cx={56} cy={44} r={2} fill="#1F2937" />
          <Path
            d="M46 52 Q 50 55 54 52"
            stroke="#6B7280"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      )}
    </View>
  );
};
