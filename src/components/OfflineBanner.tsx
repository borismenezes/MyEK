import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme/index';
import { useNetworkStore } from '@store/useNetworkStore';
import { useIsOnline } from '@hooks/useNetworkStatus';
import { timeAgo } from '@utils/index';
import { Icon } from './Icon';

/**
 * Visible height of the banner below the safe-area inset. Exported so
 * screens (e.g. HomeScreen) can shift their header down by this amount
 * when offline, keeping the banner from overlapping page content.
 */
export const OFFLINE_BANNER_HEIGHT = 28;

/**
 * Slim banner that appears at the top of the home screen when offline.
 * Sits absolutely so it overlays the safe area without taking layout
 * space when hidden; consumers should pad their header by
 * `OFFLINE_BANNER_HEIGHT` while offline to reserve room for it.
 */
export const OfflineBanner: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const lastOnlineAt = useNetworkStore(s => s.lastOnlineAt);

  const fullHeight = insets.top + OFFLINE_BANNER_HEIGHT;
  const offset = useSharedValue(-fullHeight);

  useEffect(() => {
    offset.value = withTiming(online ? -fullHeight : 0, { duration: 240 });
  }, [online, offset, fullHeight]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Animated.View
      pointerEvents={online ? 'none' : 'auto'}
      style={[
        styles.wrapper,
        animStyle,
        {
          backgroundColor: theme.colors.amber,
          paddingTop: insets.top + 5,
        },
      ]}>
      <View style={styles.row}>
        <Icon name="wifi-off" size={12} color="white" />
        <Text style={styles.text}>
          {'No internet connection · data as of '}
          {lastOnlineAt ? timeAgo(lastOnlineAt) : 'a while ago'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 6,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    height: 17,
  },
  text: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});
