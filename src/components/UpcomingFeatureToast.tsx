import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@theme/index';

const VISIBLE_MS = 2200;
const ANIM_MS = 200;

interface UpcomingFeatureToastProps {
  /**
   * Increment to trigger a fresh appearance. Re-triggering while the toast
   * is already on screen resets the hide timer (so rapid taps keep it
   * visible instead of letting it fade and re-fade).
   */
  triggerKey: number;
  message?: string;
  /**
   * Vertical offset from the top of the parent. Pass the measured header
   * height so the toast appears just below the header rather than at the
   * screen edge / under the status bar.
   */
  topOffset?: number;
}

/**
 * Tiny self-dismissing toast pinned just below the header. Used to surface
 * "this feature isn't ready yet" feedback when the user taps a widget that
 * has no detail screen — better than a silent no-op.
 *
 * Animation: short fade-in + slight slide-down, hold for ~2.2s, fade-out.
 * Unmounts itself when the exit animation finishes so it doesn't sit on the
 * tree consuming layout/event space between triggers.
 */
export const UpcomingFeatureToast: React.FC<UpcomingFeatureToastProps> = ({ triggerKey, message, topOffset = 0 }) => {
  const theme = useTheme();
  const opacity = useSharedValue(0);
  const offset = useSharedValue(-8);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (triggerKey === 0) return;
    setMounted(true);
    opacity.value = withTiming(1, { duration: ANIM_MS, easing: Easing.out(Easing.cubic) });
    offset.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.cubic) });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: ANIM_MS, easing: Easing.in(Easing.cubic) });
      offset.value = withTiming(-8, { duration: ANIM_MS, easing: Easing.in(Easing.cubic) }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }, VISIBLE_MS);

    return () => clearTimeout(timeout);
  }, [triggerKey, opacity, offset]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  if (!mounted) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: topOffset }]}>
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor: theme.colors.amberSoft },
          animStyle,
        ]}>
        <Text style={{ fontSize: 11, color: theme.colors.amber, fontWeight: '600' }}>
          {message ?? 'Coming soon · this feature is on the way'}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 6,
  },
});
