import type { TextStyle } from 'react-native';

/**
 * MyEK shared design tokens. Single source of truth for the brand palette,
 * shape, and widget typography — so a federated remote's UI matches the host
 * exactly instead of hard-coding hexes.
 *
 * Slice 1 exposes the *static* light theme (the app default). Slice 2 will share
 * the ThemeProvider/useTheme context as an MF singleton so remotes react to
 * light/dark + brand switching. Mirrors `src/theme/tokens.ts` (light) — keep in
 * sync until the host's tokens are unified onto this package.
 */
export interface ThemeColors {
  ekRed: string;
  ekRedDark: string;
  ekGold: string;
  ink: string;
  inkSecondary: string;
  muted: string;
  mutedStrong: string;
  line: string;
  bg: string;
  surface: string;
  surfaceElevated: string;
  green: string;
  greenSoft: string;
  amber: string;
  amberSoft: string;
  blue: string;
  blueSoft: string;
  purple: string;
  purpleSoft: string;
  shadow: string;
  overlay: string;
}

const lightColors: ThemeColors = {
  ekRed: 'rgb(198, 12, 48)',
  ekRedDark: 'rgb(139, 0, 0)',
  ekGold: 'rgb(196, 158, 78)',
  ink: 'rgb(10, 10, 10)',
  inkSecondary: 'rgb(26, 26, 26)',
  muted: 'rgb(115, 115, 115)',
  mutedStrong: 'rgb(85, 85, 85)',
  line: 'rgb(229, 229, 229)',
  bg: 'rgb(245, 245, 245)',
  surface: 'rgb(255, 255, 255)',
  surfaceElevated: 'rgb(255, 255, 255)',
  green: 'rgb(22, 163, 74)',
  greenSoft: 'rgb(220, 252, 231)',
  amber: 'rgb(217, 119, 6)',
  amberSoft: 'rgb(254, 243, 199)',
  blue: 'rgb(2, 132, 199)',
  blueSoft: 'rgb(224, 242, 254)',
  purple: 'rgb(124, 58, 237)',
  purpleSoft: 'rgb(237, 233, 254)',
  shadow: 'rgba(0, 0, 0, 0.04)',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const theme = {
  mode: 'light' as const,
  colors: lightColors,
  spacing: (n: number) => n * 4,
  radius: { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 },
  font: {
    family: 'Urbanist',
    weight: { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' },
    size: { xs: 10, sm: 11, md: 12, lg: 14, xl: 18, xxl: 28 },
  },
} as const;

export type Theme = typeof theme;

/** Widget typography scale (mirrors src/theme/widgetTheme.ts). */
export const widgetTheme = {
  fontSize: {
    xs: 8, micro: 9, caption: 10, label: 11, body: 12, bodyEmphasis: 13,
    value: 14, titleSm: 15, titleMd: 16, titleLg: 17, titleXl: 18,
    headline: 22, display: 28, displayLg: 30, hero: 36,
  },
  fontWeight: {
    medium: '500', semibold: '600', bold: '700', heavy: '800',
  } as Record<'medium' | 'semibold' | 'bold' | 'heavy', TextStyle['fontWeight']>,
} as const;
