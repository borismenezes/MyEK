import type { TextStyle } from 'react-native';
import { type PlatformUser } from '@myek/platform';
export { Icon } from './Icon';
export type { IconName } from './Icon';
export { buildVCard } from './vcard';
export type { ContactCard } from './vcard';
export { WidgetErrorState } from './WidgetErrorState';
/**
 * Reactive read of the host-published user. Re-renders the consumer whenever the
 * host republishes (e.g. when Graph /me lands and overrides employeeId), so a
 * federated remote never shows stale token-derived identity. Mirrors useTheme().
 */
export declare function usePlatformUser(): PlatformUser | null;
/**
 * MyEK shared design tokens — the CANONICAL source for both palettes. The
 * host's `src/theme/tokens.ts` re-exports from here (it no longer carries its
 * own copy), so host and remotes literally render from the same objects.
 *
 * The exported `theme` constant is the *static light* palette — the safe
 * default when a remote renders outside the host (standalone dev server, or
 * before the host has published). For live light/dark, components call
 * `useTheme()`, which reads the host's active theme off the `@myek/platform`
 * bridge and re-renders on toggle.
 *
 * Token layering: `ThemeColors` is mostly SEMANTIC (bg/surface/ink/muted/line
 * carry intent, not hue) with the brand palette (ekRed/ekGold) and a small
 * accent set alongside. New tokens should be semantic — that's what keeps a
 * future brand variant or palette tweak a one-file change.
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
/**
 * Theme shape — structurally identical to the host's `Theme`
 * (src/types/theme.ts), and to `PlatformTheme` on the bridge. Mode-agnostic
 * so light and dark share one type.
 */
export interface Theme {
    mode: 'light' | 'dark';
    colors: ThemeColors;
    spacing: (n: number) => number;
    radius: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
        pill: number;
    };
    font: {
        family: string;
        weight: {
            regular: '400';
            medium: '500';
            semibold: '600';
            bold: '700';
            heavy: '800';
        };
        size: {
            xs: number;
            sm: number;
            md: number;
            lg: number;
            xl: number;
            xxl: number;
        };
    };
}
export declare const lightTheme: Theme;
export declare const darkTheme: Theme;
export declare const themes: {
    readonly light: Theme;
    readonly dark: Theme;
};
/** Static light palette — the standalone/pre-bridge default. Prefer useTheme(). */
export declare const theme: Theme;
/**
 * Active theme for federated UI. Subscribes to the host's published theme via
 * the `@myek/platform` bridge, so a component re-renders when the user toggles
 * light/dark. Falls back to the static light `theme` when the host hasn't
 * published (standalone remote, or pre-bridge render). Use this instead of
 * importing the static `theme` wherever colours must follow the host.
 */
export declare function useTheme(): Theme;
/** Widget typography scale (mirrors src/theme/widgetTheme.ts). */
export declare const widgetTheme: {
    readonly fontSize: {
        readonly xs: 8;
        readonly micro: 9;
        readonly caption: 10;
        readonly label: 11;
        readonly body: 12;
        readonly bodyEmphasis: 13;
        readonly value: 14;
        readonly titleSm: 15;
        readonly titleMd: 16;
        readonly titleLg: 17;
        readonly titleXl: 18;
        readonly headline: 22;
        readonly display: 28;
        readonly displayLg: 30;
        readonly hero: 36;
    };
    readonly fontWeight: Record<"medium" | "semibold" | "bold" | "heavy", TextStyle["fontWeight"]>;
};
