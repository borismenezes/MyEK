import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@theme/index';

type PillTone = 'red' | 'gold' | 'green' | 'amber' | 'blue' | 'purple' | 'gray';

interface PillProps {
  tone?: PillTone;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

/**
 * Compact tinted badge. Tones map to the theme palette; the soft variant is
 * used as the background and the saturated variant as the text colour.
 */
export const Pill: React.FC<PillProps> = ({ tone = 'gray', children, size = 'md' }) => {
  const theme = useTheme();
  const map: Record<PillTone, { bg: string; fg: string }> = {
    red: { bg: 'rgba(198,12,48,0.08)', fg: theme.colors.ekRed },
    gold: { bg: 'rgba(196,158,78,0.14)', fg: theme.colors.ekGold },
    green: { bg: theme.colors.greenSoft, fg: theme.colors.green },
    amber: { bg: theme.colors.amberSoft, fg: theme.colors.amber },
    blue: { bg: theme.colors.blueSoft, fg: theme.colors.blue },
    purple: { bg: theme.colors.purpleSoft, fg: theme.colors.purple },
    gray: { bg: theme.colors.bg, fg: theme.colors.mutedStrong },
  };
  const { bg, fg } = map[tone];
  const padV = size === 'sm' ? 2 : 4;
  const padH = size === 'sm' ? 6 : 10;
  const fontSize = size === 'sm' ? 9 : 11;

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: padH,
        paddingVertical: padV,
        borderRadius: 999,
        alignSelf: 'flex-start',
      }}>
      <Text style={{ color: fg, fontSize, fontWeight: '600' }}>{children}</Text>
    </View>
  );
};
