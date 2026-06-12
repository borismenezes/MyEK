import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme, widgetTheme } from './index';

/**
 * In-tile error state for SELF-FETCHING widgets.
 *
 * When a remote's own query fails and there's no host-fed fallback payload,
 * the tile must say so — a blank tile on outage is silent degradation (the
 * project's no-silent-fallback rule). One shared implementation so every
 * remote's failure mode looks and behaves the same.
 */
export const WidgetErrorState: React.FC<{
  message?: string;
  /** Re-runs the widget's query (e.g. `() => void query.refetch()`). */
  onRetry?: () => void;
}> = ({ message = "Couldn't load", onRetry }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }}>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.label,
          color: theme.colors.muted,
          textAlign: 'center',
        }}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.bg,
          }}>
          <Text
            style={{
              fontSize: widgetTheme.fontSize.label,
              fontWeight: widgetTheme.fontWeight.semibold,
              color: theme.colors.ink,
            }}>
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};
