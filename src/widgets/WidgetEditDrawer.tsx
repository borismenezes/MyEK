import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DraggableGrid, Icon } from '@components/index';
import { OFFLINE_BANNER_HEIGHT } from '@components/OfflineBanner';
import { useIsOnline } from '@hooks/useNetworkStatus';
import { useTheme, widgetTheme } from '@theme/index';
import type { WidgetConfig } from '@/types';
import { WidgetRegistry, createWidgetConfig } from './WidgetRegistry';
import { WidgetRenderer } from './WidgetRenderer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WidgetEditDrawerProps {
  visible: boolean;
  layout: WidgetConfig[];
  onClose: () => void;
  onAdd: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
  /**
   * Fires when the user reorders the added widgets via long-press + drag
   * inside the drawer. Receives the new array order. The HomeScreen
   * persists this and pushes it back into the layout.
   */
  onReorder: (next: WidgetConfig[]) => void;
}

const noop = () => {};

/**
 * Bottom-sheet edit drawer that mirrors the iOS home-screen widget editor.
 *
 *  - Slides up with a spring; backdrop fades in.
 *  - Renders ALL widgets (added + available) using the real WidgetRenderer
 *    so the user sees a true-to-life preview at the same size and layout
 *    as the home grid (via the shared DraggableGrid).
 *  - Each tile wobbles continuously and shows a neutral badge centred on its
 *    top-RIGHT corner: "−" for added (tap to remove), "+" for available (tap
 *    to add).
 *  - Tap the backdrop or the Done pill to dismiss.
 */
export const WidgetEditDrawer: React.FC<WidgetEditDrawerProps> = ({
  visible,
  layout,
  onClose,
  onAdd,
  onRemove,
  onReorder,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  // Reserve space at the top of the screen so the drawer never sits under the
  // status bar / offline banner. When offline we drop below the amber bar with
  // a small breathing gap; otherwise we keep the iOS-style 10% peek.
  const drawerTop = online
    ? SCREEN_HEIGHT * 0.1
    : insets.top + OFFLINE_BANNER_HEIGHT + 12;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, { damping: 22, stiffness: 180, mass: 0.9 });
    } else {
      progress.value = withTiming(0, { duration: 240 }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [SCREEN_HEIGHT, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const { addedConfigs, availableConfigs } = useMemo(() => {
    const addedIds = new Set(layout.map(item => item.widgetId));
    const available = Object.values(WidgetRegistry)
      .filter(entry => !addedIds.has(entry.widgetId))
      .map(entry => createWidgetConfig(entry.widgetId))
      .filter((c): c is WidgetConfig => c !== null);
    return { addedConfigs: layout, availableConfigs: available };
  }, [layout]);

  if (!mounted && !visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]} pointerEvents="none">
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'dark' ? 'dark' : 'light'}
          blurAmount={18}
          reducedTransparencyFallbackColor={theme.colors.bg}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            top: drawerTop,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: insets.bottom + 8,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: -4 },
            shadowRadius: 16,
            elevation: 12,
          },
          sheetStyle,
        ]}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.line }} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 8,
          }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: widgetTheme.fontSize.headline, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink, letterSpacing: -0.4 }}>
              Edit Widgets
            </Text>
            <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted, marginTop: 2 }}>
              Tap − to remove · tap + to add
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.ekRed,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Text style={{ color: 'white', fontWeight: widgetTheme.fontWeight.semibold, fontSize: widgetTheme.fontSize.bodyEmphasis }}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}>
          {addedConfigs.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <SectionLabel title={`ADDED · ${addedConfigs.length} · drag to reorder`} />
              {/* `editing={true}` switches DraggableGrid into pan-to-drag
                  mode so users can long-press and reorder right inside
                  the drawer. The corner badge stays its own touch
                  target inside PreviewTile so taps still remove. */}
              <DraggableGrid
                items={addedConfigs}
                editing={true}
                onReorder={onReorder}
                renderItem={item => (
                  <PreviewTile action="remove" onPress={() => onRemove(item.widgetId)}>
                    <WidgetRenderer config={item} preview />
                  </PreviewTile>
                )}
              />
            </View>
          ) : null}

          {availableConfigs.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <SectionLabel title={`AVAILABLE · ${availableConfigs.length}`} />
              <DraggableGrid
                items={availableConfigs}
                editing={false}
                onReorder={noop}
                renderItem={item => (
                  <PreviewTile action="add" onPress={() => onAdd(item.widgetId)}>
                    <WidgetRenderer config={item} preview />
                  </PreviewTile>
                )}
              />
            </View>
          ) : null}

          {addedConfigs.length === 0 && availableConfigs.length === 0 ? (
            <Text style={{ textAlign: 'center', color: theme.colors.muted, marginTop: 32 }}>
              No widgets configured.
            </Text>
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: widgetTheme.fontSize.body,
        fontWeight: widgetTheme.fontWeight.bold,
        color: theme.colors.muted,
        letterSpacing: 1.5,
        paddingHorizontal: 20,
        marginBottom: 8,
      }}>
      {title}
    </Text>
  );
};

interface PreviewTileProps {
  action: 'add' | 'remove';
  onPress: () => void;
  children: React.ReactNode;
}

/**
 * Wraps a real widget render in a continuous wobble. The corner badge is the
 * ONLY tap target (own Pressable) — leaving the rest of the tile free for
 * the parent DraggableGrid's pan gesture to drive long-press + drag reorder
 * in the added section.
 */
const PreviewTile: React.FC<PreviewTileProps> = ({ action, onPress, children }) => (
  <JigglingTile>
    <View style={{ flex: 1 }}>
      <View pointerEvents="none" style={{ flex: 1 }}>
        {children}
      </View>
      {/* hitSlop extends DOWN/LEFT only — into the tile, which has no other
          tap targets. Upward/rightward slop would overlap the previous row's
          tile (row gap is 12, the box already reaches 13 past the corner)
          and risk a surprise remove on a near-miss tap there. */}
      <Pressable onPress={onPress} hitSlop={{ bottom: 8, left: 8, top: 0, right: 0 }} style={styles.badgeHit}>
        <CornerBadge action={action} />
      </Pressable>
    </View>
  </JigglingTile>
);

const styles = StyleSheet.create({
  // The 26px badge is pinned to this box's top-right, and the box is offset
  // -13 (half the BADGE size) — so the badge centre sits exactly on the
  // widget corner, while the 36×36 hit area extends inward/downward into the
  // tile rather than 18px upward into the previous grid row (row gap is 12).
  badgeHit: {
    position: 'absolute',
    top: -13,
    right: -13,
    width: 36,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    zIndex: 11,
  },
});

const JigglingTile: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(0.6, { duration: 140 + Math.random() * 80, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
};

const CornerBadge: React.FC<{ action: 'add' | 'remove' }> = ({ action }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        // Neutral for both actions (iOS-editor style) — the glyph alone says
        // add vs remove; red/green made the grid read like an alert wall.
        backgroundColor: theme.colors.mutedStrong,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 5,
        zIndex: 10,
      }}>
      {action === 'remove' ? (
        <Text style={{ color: theme.colors.surface, fontWeight: widgetTheme.fontWeight.bold, fontSize: widgetTheme.fontSize.titleXl, lineHeight: 18, marginTop: -2 }}>−</Text>
      ) : (
        <Icon name="plus" size={14} color={theme.colors.surface} stroke={2.5} />
      )}
    </View>
  );
};
