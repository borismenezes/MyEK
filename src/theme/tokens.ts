import type { Theme, ThemeColors } from '@/types';

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

const darkColors: ThemeColors = {
  ekRed: 'rgb(232, 56, 90)',
  ekRedDark: 'rgb(180, 30, 60)',
  ekGold: 'rgb(212, 178, 102)',
  ink: 'rgb(245, 245, 245)',
  inkSecondary: 'rgb(220, 220, 220)',
  muted: 'rgb(150, 150, 150)',
  mutedStrong: 'rgb(180, 180, 180)',
  line: 'rgb(40, 40, 44)',
  bg: 'rgb(10, 10, 14)',
  surface: 'rgb(22, 22, 26)',
  surfaceElevated: 'rgb(30, 30, 36)',
  green: 'rgb(34, 197, 94)',
  greenSoft: 'rgba(34, 197, 94, 0.15)',
  amber: 'rgb(245, 158, 11)',
  amberSoft: 'rgba(245, 158, 11, 0.15)',
  blue: 'rgb(56, 189, 248)',
  blueSoft: 'rgba(56, 189, 248, 0.15)',
  purple: 'rgb(167, 139, 250)',
  purpleSoft: 'rgba(167, 139, 250, 0.15)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

const baseShape = {
  spacing: (n: number) => n * 4,
  radius: { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 },
  font: {
    family: 'Urbanist',
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      heavy: '800',
    },
    size: { xs: 10, sm: 11, md: 12, lg: 14, xl: 18, xxl: 28 },
  },
} as const;

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  ...baseShape,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  ...baseShape,
};

export const themes = { light: lightTheme, dark: darkTheme };
