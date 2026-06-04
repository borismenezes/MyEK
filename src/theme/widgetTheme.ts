import type { TextStyle } from 'react-native';

/**
 * Centralised typography scale for the home-screen widgets.
 *
 * Every widget references `widgetTheme.fontSize.*` and
 * `widgetTheme.fontWeight.*` instead of hard-coding values inline.
 * Tweaking a token here flows through every tile so the home grid stays
 * visually consistent. Colours stay theme-driven via `useTheme()`;
 * letter-spacing and line-height stay per-widget because they encode
 * intent specific to that tile (hero numbers, dark cards, etc.).
 */
export const widgetTheme = {
  fontSize: {
    /** 8 — micro caps (compact ring "TODAY") */
    xs: 8,
    /** 9 — micro labels, badges, tags */
    micro: 9,
    /** 10 — small captions, deltas, ID labels */
    caption: 10,
    /** 11 — section labels, helper text (most common) */
    label: 11,
    /** 12 — body small, units */
    body: 12,
    /** 13 — emphasised body, list items, button labels */
    bodyEmphasis: 13,
    /** 14 — values (ring, schedule date) */
    value: 14,
    /** 15 — small titles (identity name) */
    titleSm: 15,
    /** 16 — medium titles (ring large value) */
    titleMd: 16,
    /** 17 — large titles in compact slots */
    titleLg: 17,
    /** 18 — extra-large headline glyphs */
    titleXl: 18,
    /** 22 — section headlines */
    headline: 22,
    /** 28 — display number */
    display: 28,
    /** 30 — large display numbers */
    displayLg: 30,
    /** 36 — hero stat */
    hero: 36,
  },
  fontWeight: {
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  } as Record<'medium' | 'semibold' | 'bold' | 'heavy', TextStyle['fontWeight']>,
} as const;

export type WidgetFontSize = keyof typeof widgetTheme.fontSize;
export type WidgetFontWeight = keyof typeof widgetTheme.fontWeight;
