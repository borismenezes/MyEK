export type ThemeMode = 'light' | 'dark' | 'system';

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

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  font: {
    family: string;
    weight: { regular: '400'; medium: '500'; semibold: '600'; bold: '700'; heavy: '800' };
    size: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  };
}
