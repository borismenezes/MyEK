import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface AgentLogoProps {
  size?: number;
}

/**
 * Compact "agent" logo: a four-point sparkle nested inside an orbital ring,
 * with a smaller satellite sparkle. Reads as "intelligent / generative"
 * without being a literal robot face. Uses an internal gradient so the
 * mark feels alive even when sat still on a flat surface.
 */
export const AgentLogo: React.FC<AgentLogoProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Defs>
      <LinearGradient id="agentLogoGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#FF4D6D" />
        <Stop offset="40%" stopColor="#C60C30" />
        <Stop offset="100%" stopColor="#4F46E5" />
      </LinearGradient>
    </Defs>
    {/* Orbit */}
    <Circle cx={32} cy={32} r={26} stroke="url(#agentLogoGrad)" strokeWidth={1.6} fill="none" opacity={0.55} />
    {/* Primary sparkle */}
    <Path
      d="M36 12 L39.5 25.8 L53 30 L39.5 33.5 L36 47.5 L32.5 33.5 L19 30 L32.5 25.8 Z"
      fill="url(#agentLogoGrad)"
    />
    {/* Satellite sparkle */}
    <Path
      d="M18 44 L19.6 48.2 L23.8 50 L19.6 51.6 L18 56 L16.4 51.6 L12 50 L16.4 48.2 Z"
      fill="url(#agentLogoGrad)"
    />
  </Svg>
);
