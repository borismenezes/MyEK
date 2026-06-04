import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@theme/index';
import { Icon } from './Icon';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, compact }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: compact ? 12 : 24,
        gap: 8,
      }}>
      <Icon name="wifi-off" size={compact ? 18 : 22} color={theme.colors.muted} />
      <Text
        style={{
          color: theme.colors.muted,
          fontSize: compact ? 11 : 12,
          textAlign: 'center',
          fontWeight: '500',
          paddingHorizontal: 8,
        }}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={{
            marginTop: 4,
            paddingHorizontal: 14,
            paddingVertical: 6,
            backgroundColor: theme.colors.bg,
            borderRadius: 999,
          }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.ekRed }}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
};
