import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { useTheme } from '@theme/index';

export type IconName =
  | 'home'
  | 'card'
  | 'user'
  | 'calendar'
  | 'apps'
  | 'plus'
  | 'check'
  | 'edit'
  | 'plane'
  | 'plane-flat'
  | 'gift'
  | 'clock'
  | 'star'
  | 'wallet'
  | 'doc'
  | 'briefcase'
  | 'passport'
  | 'meeting'
  | 'timesheet'
  | 'sparkles'
  | 'chevron'
  | 'chevron-down'
  | 'close'
  | 'bell'
  | 'cake'
  | 'globe'
  | 'medal'
  | 'mail'
  | 'phone'
  | 'pin'
  | 'building'
  | 'arrow-right'
  | 'logout'
  | 'drag'
  | 'sun'
  | 'moon'
  | 'wifi-off'
  | 'help'
  | 'layers'
  | 'more'
  | 'share'
  | 'roster'
  | 'ai-spark'
  | 'mic'
  | 'arrow-up';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

export const Icon: React.FC<IconProps> = ({ name, size = 18, color, stroke = 1.8 }) => {
  const theme = useTheme();
  const c = color ?? theme.colors.ink;
  const p = { stroke: c, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />
        </Svg>
      );
    case 'card':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={2} y={5} width={20} height={14} rx={3} />
          <Path {...p} d="M2 10h20" />
        </Svg>
      );
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4 21c1-4 4-6 8-6s7 2 8 6" />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={3} y={5} width={18} height={16} rx={3} />
          <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
        </Svg>
      );
    case 'apps':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={3} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={14} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={3} y={14} width={7} height={7} rx={1.5} />
          <Rect {...p} x={14} y={14} width={7} height={7} rx={1.5} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 5v14M5 12h14" />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M5 13l4 4L19 7" />
        </Svg>
      );
    case 'edit':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M4 20h4l10-10-4-4L4 16v4z" />
          <Path {...p} d="M14 6l4 4" />
        </Svg>
      );
    case 'plane':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M2 16l9-3 4 7 2-1-1-7 7-3 1-3-9 1L9 2 7 3l3 6-7 4z" />
        </Svg>
      );
    case 'plane-flat':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M22 12l-9 4-1 5-2-1-1-4-7-2 6-3 1-5h2l3 4 8-1z" fill={c} />
        </Svg>
      );
    case 'gift':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={3} y={8} width={18} height={13} rx={2} />
          <Path {...p} d="M3 12h18M12 8v13M8 8a3 3 0 010-6c2 0 4 6 4 6M16 8a3 3 0 000-6c-2 0-4 6-4 6" />
        </Svg>
      );
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 7v5l3 2" />
        </Svg>
      );
    case 'star':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 3l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" />
        </Svg>
      );
    case 'wallet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M3 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          <Path {...p} d="M19 11h2v4h-2zM7 5V3h10v2" />
        </Svg>
      );
    case 'doc':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M6 3h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
          <Path {...p} d="M14 3v6h6M8 14h8M8 18h6" />
        </Svg>
      );
    case 'briefcase':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={3} y={7} width={18} height={13} rx={2} />
          <Path {...p} d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
        </Svg>
      );
    case 'passport':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={5} y={3} width={14} height={18} rx={2} />
          <Circle {...p} cx={12} cy={11} r={3} />
          <Path {...p} d="M9 17h6" />
        </Svg>
      );
    case 'meeting':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={9} cy={9} r={3} />
          <Circle {...p} cx={17} cy={10} r={2.5} />
          <Path {...p} d="M3 19c1-3 3-4 6-4s5 1 6 4M14 18c1-2 2-3 4-3s3 1 4 3" />
        </Svg>
      );
    case 'timesheet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={4} y={4} width={16} height={16} rx={2} />
          <Path {...p} d="M8 9h8M8 13h8M8 17h5" />
        </Svg>
      );
    case 'sparkles':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z M19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" fill={c} />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M9 6l6 6-6 6" />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M6 9l6 6 6-6" />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M6 6l12 12M18 6l-12 12" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 004 0" />
        </Svg>
      );
    case 'cake':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M3 14h18v6H3zM5 14V10a3 3 0 013-3h8a3 3 0 013 3v4M9 7V4M12 7V3M15 7V4" />
        </Svg>
      );
    case 'globe':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
        </Svg>
      );
    case 'medal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={12} cy={14} r={6} />
          <Path {...p} d="M9 8L7 3h10l-2 5" />
        </Svg>
      );
    case 'mail':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={3} y={5} width={18} height={14} rx={2} />
          <Path {...p} d="M3 7l9 6 9-6" />
        </Svg>
      );
    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M5 4h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A18 18 0 013 6a2 2 0 012-2z" />
        </Svg>
      );
    case 'pin':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 21s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z" />
          <Circle {...p} cx={12} cy={9} r={2.5} />
        </Svg>
      );
    case 'building':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={4} y={3} width={16} height={18} rx={1.5} />
          <Path {...p} d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
        </Svg>
      );
    case 'arrow-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
      );
    case 'logout':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Path {...p} d="M16 17l5-5-5-5M21 12H9" />
        </Svg>
      );
    case 'drag':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G fill={c}>
            <Circle cx={9} cy={6} r={1.6} />
            <Circle cx={9} cy={12} r={1.6} />
            <Circle cx={9} cy={18} r={1.6} />
            <Circle cx={15} cy={6} r={1.6} />
            <Circle cx={15} cy={12} r={1.6} />
            <Circle cx={15} cy={18} r={1.6} />
          </G>
        </Svg>
      );
    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={12} cy={12} r={4} />
          <Path {...p} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
        </Svg>
      );
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </Svg>
      );
    case 'wifi-off':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M2 8.5a16 16 0 0120-2M5 12a12 12 0 0114-1M8 15.5a8 8 0 018-1M12 19h.01M3 3l18 18" />
        </Svg>
      );
    case 'help':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M9.5 9a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5" />
          <Circle cx={12} cy={17} r={1} fill={c} />
        </Svg>
      );
    case 'layers':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 3l9 5-9 5-9-5 9-5z" />
          <Path {...p} d="M3 13l9 5 9-5" />
          <Path {...p} d="M3 18l9 5 9-5" />
        </Svg>
      );
    case 'more':
      // Horizontal three-dot kebab — the standard "more options" affordance.
      // Filled circles (no stroke) so the icon stays legible at the small
      // size used inside the bottom tab bar.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={5} cy={12} r={1.9} fill={c} />
          <Circle cx={12} cy={12} r={1.9} fill={c} />
          <Circle cx={19} cy={12} r={1.9} fill={c} />
        </Svg>
      );
    case 'share':
      // iOS-style "up-arrow-out-of-box". Reads as "share" on both iOS and
      // Android because the tray UI is the same affordance there.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 3v13M8 7l4-4 4 4" />
          <Path {...p} d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </Svg>
      );
    case 'roster':
      // Clipboard with three schedule rows — reads as "duty roster" / "crew
      // schedule" and stays distinct from `calendar` (month grid) and
      // `timesheet` (hours bar) so the icons in the widget header are easy
      // to tell apart at a glance.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={5} y={4} width={14} height={17} rx={2} />
          <Rect {...p} x={9} y={2.5} width={6} height={3} rx={1} />
          <Path {...p} d="M8 11h8M8 14.5h8M8 18h5" />
        </Svg>
      );
    case 'mic':
      // Rounded mic capsule with stand — standard "voice input" affordance.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={9} y={3} width={6} height={11} rx={3} />
          <Path {...p} d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" />
        </Svg>
      );
    case 'arrow-up':
      // Used as the "send" affordance in the chat composer — reads more
      // immediately as "submit message" than a paper-plane glyph at small
      // sizes and stays consistent with the iOS messaging idiom.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 20V5M5 12l7-7 7 7" />
        </Svg>
      );
    case 'ai-spark':
      // Four-point sparkle stacked on a smaller satellite sparkle — reads as
      // "AI / generative". Used by the AI Agent tab and any agent surface.
      // Filled with the current colour so the icon mass survives at small
      // sizes in the tab bar.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M14 3 L15.7 8.7 L21.4 10.4 L15.7 12.1 L14 17.8 L12.3 12.1 L6.6 10.4 L12.3 8.7 Z"
            fill={c}
          />
          <Path
            d="M7 15 L7.9 17.3 L10.2 18.2 L7.9 19.1 L7 21.4 L6.1 19.1 L3.8 18.2 L6.1 17.3 Z"
            fill={c}
          />
        </Svg>
      );
    default:
      return null;
  }
};

/**
 * Every glyph the Icon component can actually draw. Kept in sync with the
 * `IconName` union above (a name in the union but not here would resolve to a
 * blank bubble, which is the bug this set exists to prevent).
 */
export const ICON_NAMES: ReadonlySet<IconName> = new Set<IconName>([
  'home', 'card', 'user', 'calendar', 'apps', 'plus', 'check', 'edit', 'plane',
  'plane-flat', 'gift', 'clock', 'star', 'wallet', 'doc', 'briefcase', 'passport',
  'meeting', 'timesheet', 'sparkles', 'chevron', 'chevron-down', 'close', 'bell',
  'cake', 'globe', 'medal', 'mail', 'phone', 'pin', 'building', 'arrow-right',
  'drag', 'sun', 'moon', 'wifi-off', 'help', 'layers', 'more', 'share', 'roster',
  'ai-spark', 'mic', 'arrow-up',
]);

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && ICON_NAMES.has(value as IconName);
}

/**
 * Keyword → glyph map used to recover a professional icon when the backend
 * sends an icon name this app doesn't ship (or none at all). Keys are matched
 * as substrings against the app id / supplied icon string, longest first, so
 * "businessCard" → card, "myTrips" → plane, etc. Keeps the Services tab fully
 * iconned regardless of what the live manifest provides.
 */
const ICON_KEYWORDS: ReadonlyArray<[string, IconName]> = [
  ['businesscard', 'card'], ['payslip', 'wallet'], ['payroll', 'wallet'],
  ['appreciation', 'medal'], ['platinum', 'gift'], ['voucher', 'gift'],
  ['attendance', 'clock'], ['timesheet', 'timesheet'], ['roster', 'roster'],
  ['document', 'passport'], ['passport', 'passport'], ['trip', 'plane'],
  ['flight', 'plane'], ['leave', 'calendar'], ['event', 'cake'],
  ['meeting', 'meeting'], ['outlook', 'meeting'], ['jira', 'layers'],
  ['ticket', 'layers'], ['application', 'briefcase'], ['profile', 'user'],
  ['card', 'card'], ['wallet', 'wallet'], ['calendar', 'calendar'],
  ['mail', 'mail'], ['phone', 'phone'], ['building', 'building'],
];

/**
 * Resolve any backend-supplied icon string to a glyph that actually renders.
 *   1. exact match against a shipped glyph,
 *   2. keyword match against the icon string and an optional id hint
 *      (e.g. the appId), longest keyword first,
 *   3. a neutral, professional default (`apps`).
 */
export function resolveIconName(raw: unknown, hint?: string): IconName {
  if (isIconName(raw)) return raw;
  const haystack = `${typeof raw === 'string' ? raw : ''} ${hint ?? ''}`.toLowerCase();
  let best: IconName | null = null;
  let bestLen = 0;
  for (const [kw, name] of ICON_KEYWORDS) {
    if (haystack.includes(kw) && kw.length > bestLen) {
      best = name;
      bestLen = kw.length;
    }
  }
  return best ?? 'apps';
}
