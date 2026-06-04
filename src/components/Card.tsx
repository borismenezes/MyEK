import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@theme/index';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/**
 * Standard widget surface — the white rounded rectangle used everywhere.
 * Everything else (gradients, dark shells, etc.) builds on this.
 */
export const Card: React.FC<CardProps> = ({ children, style, padded = true }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          padding: padded ? 16 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
          elevation: 1,
          overflow: 'hidden',
        },
        style,
      ]}>
      {children}
    </View>
  );
};
