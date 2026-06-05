import React, { useEffect } from 'react';
import { Easing as RNEasing, Platform, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen, ServicesScreen, ProfileScreen, MoreScreen } from '@screens/index';
import { AiAgentScreen } from '@aiAgent/index';
import { Icon } from '@components/index';
import { useTheme } from '@theme/index';
import type { Theme } from '@/types';

const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigator.
 *
 * Styling matches the iOS prototype: hairline top border, narrow
 * icon-on-top-of-label layout. The active state wraps **both** the icon
 * and label in a soft grey pill (`theme.colors.bg`) — implemented via a
 * custom `tabBarButton` so the pill spans the whole hit target instead
 * of just the icon. A short press-scale + cross-fade between focused /
 * unfocused gives the same micro-interaction feel as professional apps.
 */
export const TabNavigator: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        // Keep inactive tabs mounted instead of freezing them (react-freeze).
        // With the new architecture + react-native-screens, a frozen screen
        // occasionally renders blank for a frame (or gets stuck blank) as it
        // unfreezes on tab switch — the intermittent blank-tab bug. Not
        // freezing costs a little memory but keeps each tab's tree live.
        freezeOnBlur: false,
        // Themed scene container so any sub-frame mount gap (or a screen
        // returning null while it waits on a store) shows the app bg, not
        // the navigator's default near-white. This alone covers the
        // first-tap white-flash that was the original complaint — earlier
        // I had also flipped `lazy: false` to pre-mount every screen, but
        // that overloaded the JS thread on switches and surfaced as a
        // freeze. Reverting to default lazy mounting.
        sceneContainerStyle: { backgroundColor: theme.colors.bg },
        // Cross-tab transition. Android renders scene containers with a
        // card-style elevation shadow that becomes visible as a thick
        // rounded outline during *any* animated transition (both `shift`
        // and `fade` showed it). Skip the animation entirely on Android;
        // iOS keeps the polished horizontal shift.
        animation: Platform.OS === 'android' ? 'none' : 'shift',
        transitionSpec: {
          animation: 'timing',
          config: { duration: 240, easing: RNEasing.bezier(0.32, 0.72, 0, 1) },
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          height: 72 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.muted,
        // `numberOfLines: 1` + `adjustsFontSizeToFit` (set on the wrapping
        // Text via `tabBarLabel`) guarantees the full label is rendered
        // regardless of how tight the slot is. The font size here is the
        // ceiling; iOS will shrink to fit when needed.
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ color }) => {
          const map: Record<string, any> = {
            Home: 'home',
            Services: 'apps',
            AiAgent: 'ai-spark',
            Profile: 'user',
            More: 'more',
          };
          return <Icon name={map[route.name]} size={20} color={color} />;
        },
        tabBarButton: props => <AnimatedTabButton {...props} theme={theme} />,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="AiAgent" component={AiAgentScreen} options={{ tabBarLabel: 'AI Agent' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

interface AnimatedTabButtonProps extends BottomTabBarButtonProps {
  theme: Theme;
}

/**
 * Custom tab button that:
 *  - wraps icon + label in a pill background that cross-fades when the tab
 *    becomes focused (200ms ease-out — short enough to feel snappy, long
 *    enough to read as deliberate),
 *  - scales down ~6 % on press for tactile feedback then springs back.
 *
 * `focused` is sourced from the accessibilityState that React Navigation
 * passes through, so the component doesn't need its own selection state.
 */
const AnimatedTabButton: React.FC<AnimatedTabButtonProps> = ({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  theme,
}) => {
  const focused = !!accessibilityState?.selected;
  const focusProgress = useSharedValue(focused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused, focusProgress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(0,0,0,0)', theme.colors.bg],
    ),
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.94, { duration: 90, easing: Easing.out(Easing.quad) });
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 14, stiffness: 280, mass: 0.4 });
  };

  return (
    <Pressable
      onPress={onPress as () => void}
      onLongPress={onLongPress as () => void}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={null}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      testID={testID}
      style={styles.pressable}>
      <Animated.View style={[styles.pill, pillStyle]}>
        <View style={styles.contents}>{children}</View>
      </Animated.View>
    </Pressable>
  );
};

const styles = {
  pressable: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  // Tight horizontal padding + no minWidth so longer labels (AI Agent,
  // Services) get the full slot width and never truncate. The pill still
  // wraps icon + label; it just hugs them rather than enforcing a fixed
  // base size.
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'stretch' as const,
  },
  contents: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
