import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Logo } from '@components/index';
import { useAuthStore } from '@store/useAuthStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Cold-start splash overlay.
 *
 * Background, logo colour, and loading-dot colour all follow the OS
 * appearance — solid black on dark mode, solid white on light mode — so
 * the splash matches whatever the user's phone is set to rather than the
 * app's stored theme preference (which they may not have toggled yet at
 * first launch). On the lit-up side we tint the logo + dots brand red so
 * the screen still reads as MyEK rather than a generic loading scrim.
 *
 * While booting the logo holds a slow, ambient "cloth-flying" sway —
 * three sine-eased oscillators (rotation, lift, breath) running on
 * staggered periods (2.4s / 3.2s / 3.5s) so the motion never repeats the
 * same frame twice within a perceptible window. Once the auth bootstrap
 * finishes the whole layer fades out in 200ms.
 */
export const SplashScreen: React.FC = () => {
  const status = useAuthStore(s => s.status);
  const isBooting = status === 'idle' || status === 'loading';
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? '#000000' : '#FFFFFF';
  const fg = isDark ? '#FFFFFF' : '#D71921';

  const opacity = useSharedValue(1);
  const entry = useSharedValue(0);   // 0 → 1 on mount, drives the initial settle
  const sway = useSharedValue(0);    // ↻ rotateZ
  const lift = useSharedValue(0);    // ↻ translateY
  const breath = useSharedValue(0);  // ↻ scale
  const dotA = useSharedValue(0);    // ↻ loading dot 1
  const dotB = useSharedValue(0);    // ↻ loading dot 2 (300ms phase)
  const dotC = useSharedValue(0);    // ↻ loading dot 3 (600ms phase)
  const [mounted, setMounted] = useState(true);

  // Entry + ambient flutter. The withRepeat(reverse=true) loops naturally
  // ping-pong, so the logo never visibly jumps back to a start frame.
  useEffect(() => {
    entry.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    sway.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    lift.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    breath.value = withRepeat(
      withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // Staggered dot pulse — 900ms loop, 300ms phase between dots, so the
    // active dot drifts across the row instead of all three pulsing in
    // lockstep. Reads as "working, hold on" without the jitter of a
    // spinner.
    const pulse = () => withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    dotA.value = pulse();
    dotB.value = withDelay(300, pulse());
    dotC.value = withDelay(600, pulse());
  }, [entry, sway, lift, breath, dotA, dotB, dotC]);

  useEffect(() => {
    if (!isBooting) {
      // Tight exit — keeps perceived boot time low; the navigator is
      // already laid out behind us.
      opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [isBooting, opacity]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const dotStyleA = useAnimatedStyle(() => ({ opacity: interpolate(dotA.value, [0, 1], [0.25, 1]) }));
  const dotStyleB = useAnimatedStyle(() => ({ opacity: interpolate(dotB.value, [0, 1], [0.25, 1]) }));
  const dotStyleC = useAnimatedStyle(() => ({ opacity: interpolate(dotC.value, [0, 1], [0.25, 1]) }));

  const logoStyle = useAnimatedStyle(() => {
    // Entry: scale up from 0.92 + fade in, settling at 1 over 700ms.
    const entryScale = interpolate(entry.value, [0, 1], [0.92, 1]);
    const entryOpacity = entry.value;
    // Ambient flutter — small offsets so the logo *suggests* fabric in
    // wind rather than physically displacing on the page.
    const lifted = interpolate(lift.value, [0, 1], [-4, 4]);
    const swayed = interpolate(sway.value, [0, 1], [-1.5, 1.5]);
    const breathed = interpolate(breath.value, [0, 1], [1, 1.04]);
    return {
      opacity: entryOpacity,
      transform: [
        { translateY: lifted },
        { rotateZ: `${swayed}deg` },
        { scale: entryScale * breathed },
      ],
    };
  });

  if (!mounted) return null;

  const logoWidth = Math.round(SCREEN_WIDTH * 0.3);

  return (
    <Animated.View
      pointerEvents={isBooting ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { backgroundColor: bg, zIndex: 9999 }, containerStyle]}>
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Logo width={logoWidth} color={fg} />
        </Animated.View>
      </View>

      <View pointerEvents="none" style={styles.dots}>
        <Animated.View style={[styles.dot, { backgroundColor: fg }, dotStyleA]} />
        <Animated.View style={[styles.dot, { backgroundColor: fg }, dotStyleB]} />
        <Animated.View style={[styles.dot, { backgroundColor: fg }, dotStyleC]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: '14%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
