import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AgentLogo } from './AgentLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRADIENT_WIDTH = SCREEN_WIDTH * 2.4;
const CYCLE_MS = 9000;

interface AnimatedGradientBannerProps {
  height?: number;
  title?: string;
  subtitle?: string;
}

/**
 * Top banner for the AI Agent screen. Hosts a wide multi-stop gradient
 * that slowly translates left → right and back on a continuous loop,
 * giving the panel a "live" quality without being noisy.
 *
 * Implementation: SVG gradient ~2.4× screen width, animated via a single
 * shared value mapped to `translateX`. The gradient lives below an
 * `overflow: hidden` mask so the motion appears as colour drift rather
 * than the whole rect sliding. The text/logo block sits on top, untouched
 * by the animation.
 */
export const AnimatedGradientBanner: React.FC<AnimatedGradientBannerProps> = ({
  height = 200,
  title = 'AI Agent',
  subtitle = 'Ask me anything — leave, payslip, meetings, Jira.',
}) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [progress]);

  const gradientStyle = useAnimatedStyle(() => {
    const maxShift = -(GRADIENT_WIDTH - SCREEN_WIDTH);
    return {
      transform: [{ translateX: progress.value * maxShift }],
    };
  });

  return (
    <View style={[styles.host, { height }]}>
      <Animated.View style={[styles.gradientLayer, { width: GRADIENT_WIDTH, height }, gradientStyle]}>
        <Svg width={GRADIENT_WIDTH} height={height}>
          <Defs>
            <LinearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="0.6">
              <Stop offset="0%" stopColor="#0A0A20" />
              <Stop offset="22%" stopColor="#4F46E5" />
              <Stop offset="44%" stopColor="#7C3AED" />
              <Stop offset="62%" stopColor="#C60C30" />
              <Stop offset="80%" stopColor="#F59E0B" />
              <Stop offset="100%" stopColor="#0EA5E9" />
            </LinearGradient>
          </Defs>
          <Rect width={GRADIENT_WIDTH} height={height} fill="url(#bannerGrad)" />
        </Svg>
      </Animated.View>

      {/* Soft top-down fade to seat the text against the gradient */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <AgentLogo size={52} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0A0A20',
    position: 'relative',
  },
  gradientLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 4,
  },
  logoWrap: {
    marginBottom: 6,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '500',
  },
});
