import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Card, Icon, Skeleton, ErrorState } from '@components/index';
import { useTheme } from '@theme/index';
import type { WidgetSize } from '@/types';

interface WidgetShellProps {
  size: WidgetSize;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
  /** When true the shell renders no Card wrapper — useful for full-bleed gradient widgets. */
  bare?: boolean;
}

/**
 * Owned by the WidgetRenderer. Centralises the loading/error/stale chrome so
 * individual widgets only think about their happy-path content.
 */
export const WidgetShell: React.FC<WidgetShellProps> = ({ size, loading, error, isStale, onRetry, children, bare }) => {
  const theme = useTheme();
  // Body decides what to render based on state precedence: error > loading > content.
  // The skeleton ↔ content swap is cross-faded in a shared absolute-positioned
  // layer: the skeleton fades out (220ms) while the content fades in (320ms),
  // overlapping briefly so there's never an empty frame between them — the
  // flicker the home grid had when the skeleton unmounted instantly. Initial
  // mount with cached data also gets the entering fade, so widgets settle in
  // smoothly instead of popping.
  let body: React.ReactNode;
  if (error) {
    body = <ErrorState message={error} onRetry={onRetry} compact={size === 'small'} />;
  } else {
    body = (
      <View style={{ flex: 1 }}>
        {loading ? (
          <Animated.View
            key="skeleton"
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(220)}
            style={StyleSheet.absoluteFill}>
            <SkeletonLayout size={size} />
          </Animated.View>
        ) : (
          <Animated.View
            key="content"
            entering={FadeIn.duration(320)}
            style={StyleSheet.absoluteFill}>
            {children}
          </Animated.View>
        )}
      </View>
    );
  }

  if (bare) return <View style={{ flex: 1, minHeight: minHeightFor(size) }}>{body}</View>;

  return (
    <Card style={{ minHeight: minHeightFor(size), flex: 1 }}>
      {isStale && !error && !loading ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: theme.colors.amberSoft,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
          accessibilityLabel="Stale data">
          <Icon name="clock" size={12} color={theme.colors.amber} />
        </View>
      ) : null}
      {body}
    </Card>
  );
};

function minHeightFor(size: WidgetSize) {
  switch (size) {
    case 'small':
      return 155;
    case 'medium':
      return 155;
    case 'large':
      return 200;
  }
}

const SkeletonLayout: React.FC<{ size: WidgetSize }> = ({ size }) => {
  if (size === 'small') {
    return (
      <View style={{ gap: 8 }}>
        <Skeleton height={14} width="60%" />
        <View style={{ flex: 1 }} />
        <Skeleton height={28} width="50%" />
        <Skeleton height={10} width="80%" />
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={20} width="80%" />
      <Skeleton height={12} width="60%" />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Skeleton height={28} width={70} radius={999} />
        <Skeleton height={28} width={70} radius={999} />
      </View>
    </View>
  );
};
