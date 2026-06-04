import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@theme/index';

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Pulsing rectangle used while widget data is loading.
 * Uses Reanimated 3 for jank-free animation on the UI thread.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ height = 16, width = '100%', radius = 6, style }) => {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          height: height as number,
          width: width as number,
          borderRadius: radius,
          backgroundColor: theme.colors.line,
        },
        animStyle,
        style,
      ]}
    />
  );
};
