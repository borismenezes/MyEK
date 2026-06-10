import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { theme } from './index';

/**
 * Shared vector icons (subset of the host's Icon), so federated remotes render
 * the exact same glyphs as the host instead of falling back to emoji. Same
 * 24×24 viewBox + stroke style as src/components/Icon.tsx. Extend as remotes
 * need more names.
 */
export type IconName = 'calendar' | 'clock' | 'mail' | 'phone';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

export const Icon: React.FC<IconProps> = ({ name, size = 18, color, stroke = 1.8 }) => {
  const c = color ?? theme.colors.ink;
  const p = {
    stroke: c,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={3} y={5} width={18} height={16} rx={3} />
          <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
        </Svg>
      );
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 7v5l3 2" />
        </Svg>
      );
    case 'mail':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...p} x={3} y={5} width={18} height={14} rx={3} />
          <Path {...p} d="M4 7l8 6 8-6" />
        </Svg>
      );
    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
        </Svg>
      );
    default:
      return null;
  }
};
