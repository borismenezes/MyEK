import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// Reanimated imports below are needed for the disabled JigglingTile component.
// Re-add when restoring per-tile jiggle:
//   import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, DraggableGrid, Icon, OfflineBanner, PayslipSheet, UpcomingFeatureToast } from '@components/index';
import { OFFLINE_BANNER_HEIGHT } from '@components/OfflineBanner';
import { useIsOnline } from '@hooks/useNetworkStatus';
import {
  WidgetEditDrawer,
  WidgetRenderer,
  createWidgetConfig,
  defaultWidgetLayout,
  getRegistryEntry,
  findManifestEntryForWidget,
  findSmartInsertionIndex,
  layoutFromManifest,
  useTodayEvents,
  widgetLayoutStorage,
} from '@widgets/index';
import { widgetCacheKey } from '@offline/cacheManager';
import { useCacheStore } from '@store/useCacheStore';
import type { EventsPayload } from '@/types';
import { applicationsManifestService } from '@services/applicationsManifestService';
import { widgetDefaults } from '@services/defaults';
import { useAuthStore } from '@store/useAuthStore';
import { useRefreshStore } from '@store/useRefreshStore';
import { useUIStore } from '@store/useUIStore';
import { useTheme } from '@theme/index';
import type { WidgetConfig } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return '';
}

/**
 * Home screen — the iOS-like widget dashboard.
 *
 * Layout source of truth:
 *  1. Server-provided layout (from LoginResult) is the initial value.
 *  2. User edits override it locally; we persist to MMKV.
 *  3. On boot the persisted value (if any) is loaded by the auth bootstrap.
 *
 * Edit mode:
 *  - Long-press any widget to enter edit mode → grid jiggles, items become draggable.
 *  - Tap "Done" to exit. Removes (−) and resize toggle live on each tile.
 */
export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const user = useAuthStore(s => s.user);
  const storedLayout = useAuthStore(s => s.widgetLayout);
  const setLayout = useAuthStore(s => s.setWidgetLayout);
  const setManifest = useAuthStore(s => s.setManifest);
  const manifest = useAuthStore(s => s.manifest);
  const navigation = useNavigation<any>();
  const [editing, setEditing] = useState(false);
  const openIdSheet = useUIStore(s => s.setIdSheetVisible);

  // ───────────────────────────────────────────────────────────────────
  // Layout source-of-truth resolution
  //
  // Order of precedence on cold start:
  //   1. Persisted user-edited layout in MMKV         ← winner after first edit
  //   2. Layout from auth bootstrap (server)          ← if backend already filled it
  //   3. Layout derived from applicationsManifest     ← preferred first-install path
  //   4. Bundled defaultWidgetLayout                   ← last resort
  //
  // Manifest fetch happens once, asynchronously, only when we have nothing
  // persisted to fall back on. The default layout renders immediately so the
  // grid never appears empty; the manifest result then *replaces* it as soon
  // as it lands. Both writes go through `widgetLayoutStorage` so the next
  // launch is a clean MMKV-only path.
  // ───────────────────────────────────────────────────────────────────
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    // Manifest hydrates the auth store unconditionally — other screens
    // (Services, detail-screen dispatcher) read `manifest` from there to
    // discover per-app configuration regardless of how the layout was
    // resolved below.
    let cancelled = false;
    (async () => {
      const manifest = await applicationsManifestService.fetch();
      if (cancelled) return;
      setManifest(manifest);

      const fromManifest = layoutFromManifest(manifest);
      const persistedNow = widgetLayoutStorage.read();
      const baseline =
        persistedNow && persistedNow.length > 0
          ? persistedNow
          : storedLayout.length > 0
            ? storedLayout
            : null;

      if (baseline) {
        // Existing user — merge any manifest entries the persisted layout
        // doesn't yet know about (matched by widgetId). New apps shipped via
        // a manifest update show up on the home grid automatically without
        // requiring a "Reset Widget Layout".
        //
        // The events widget is prepended specifically — today's celebration
        // tile only earns its keep when it's above the fold. Other new
        // widgets land at the end so existing reorders aren't disturbed.
        const existingIds = new Set(baseline.map(c => c.widgetId));
        const additions = fromManifest.filter(c => !existingIds.has(c.widgetId));
        if (additions.length > 0) {
          const eventsAdds = additions.filter(c => c.widgetId === 'events');
          const otherAdds = additions.filter(c => c.widgetId !== 'events');
          const merged = [...eventsAdds, ...baseline, ...otherAdds];
          setLayout(merged);
          widgetLayoutStorage.write(merged);
        }
        return;
      }

      // Fresh install — manifest is the source of truth.
      if (fromManifest.length === 0) return;
      setLayout(fromManifest);
      widgetLayoutStorage.write(fromManifest);
    })();

    const persisted = widgetLayoutStorage.read();
    if (persisted && persisted.length > 0) {
      setLayout(persisted);
      return () => {
        cancelled = true;
      };
    }

    if (storedLayout.length > 0) {
      // Auth bootstrap supplied a layout but we've never persisted it —
      // capture it now so user can edit/reset against a known baseline.
      widgetLayoutStorage.write(storedLayout);
      return () => {
        cancelled = true;
      };
    }

    // First install: render bundled defaults immediately. The manifest
    // fetch above will replace this once it lands.
    setLayout(defaultWidgetLayout);
    widgetLayoutStorage.write(defaultWidgetLayout);

    return () => {
      cancelled = true;
    };
    // We only run this once on mount. storedLayout/setLayout are read at
    // this point, not subscribed to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoised layout reference: prefer the auth-store value (already hydrated
  // above) and fall back to defaults if it's somehow still empty (e.g. before
  // the effect has run on the first frame).
  const layout = useMemo(
    () =>
      // Drop any widget no longer in the registry (retired widgets that may
      // still linger in a user's saved layout or the BFF bootstrap) so they
      // never render as an "unknown widget" placeholder tile.
      (storedLayout.length > 0 ? storedLayout : defaultWidgetLayout).filter(
        item => getRegistryEntry(item.widgetId) !== null,
      ),
    [storedLayout],
  );

  // ───────────────────────────────────────────────────────────────────
  // Events visibility — the events widget only renders on the home grid
  // when at least one event in the cached payload matches today's local
  // calendar date. We subscribe to the cache store so that as soon as
  // the prefetch (or a later refresh) lands, the filter re-evaluates
  // and the widget appears or disappears without a manual refresh.
  //
  // The full layout (including the events entry) is still passed to
  // WidgetEditDrawer below — the user must always be able to find and
  // remove/reorder the widget from the editor regardless of whether
  // anything is happening today.
  // ───────────────────────────────────────────────────────────────────
  const eventsConfig = useMemo(() => layout.find(item => item.widgetId === 'events'), [layout]);
  const eventsCacheKey = eventsConfig ? widgetCacheKey(eventsConfig) : null;
  const eventsCacheEntry = useCacheStore(s => (eventsCacheKey ? s.entries[eventsCacheKey] : undefined));
  // Source of truth: prefer fetched cache, fall back to the bundled default
  // JSON. This makes the filter decision deterministic on the very first
  // render — if neither source has an event whose date matches today's
  // local calendar day, the widget is hidden outright. The boot prefetch
  // (App.tsx → widgetService.prefetch) re-checks against the network and
  // updates the cache, which causes a fresh render and reveals the widget
  // automatically when a real event lands later.
  const cachedEvents = (eventsCacheEntry?.data as EventsPayload | undefined)?.events;
  const defaultEvents = (widgetDefaults['events'] as EventsPayload | undefined)?.events;
  const sourceEvents = cachedEvents ?? defaultEvents;
  const todayEvents = useTodayEvents(sourceEvents);
  const hasEventsToday = todayEvents.length > 0;

  const visibleLayout = useMemo(() => {
    if (!eventsConfig) return layout;
    if (hasEventsToday) return layout;
    return layout.filter(item => item.widgetId !== 'events');
  }, [layout, eventsConfig, hasEventsToday]);

  // Banner only signals true emptiness — once any content is present (real
  // or static-default), the banner stays hidden. Reserves header space only
  // when the banner will actually show.
  const showOfflineBanner = !online && layout.length === 0;
  const headerTopPad = insets.top + 8 + (showOfflineBanner ? OFFLINE_BANNER_HEIGHT : 0);

  const persistAndSet = useCallback(
    (next: WidgetConfig[]) => {
      setLayout(next);
      widgetLayoutStorage.write(next);
    },
    [setLayout],
  );

  const handleRemoveById = useCallback(
    (widgetId: string) => persistAndSet(layout.filter(item => item.widgetId !== widgetId)),
    [layout, persistAndSet],
  );

  const handleAdd = useCallback(
    (widgetId: string) => {
      if (layout.some(item => item.widgetId === widgetId)) return;
      const next = createWidgetConfig(widgetId);
      if (!next) return;
      // Insert smart: a new small slots into the first empty col=1 gap;
      // a new large always lands on a fresh row at the end. Avoids both
      // wasted col=1 slots and the previous "appears to override an
      // adjacent small" symptom from the y-overlap bug.
      const insertAt = findSmartInsertionIndex(layout, next.layout.size);
      const updated = [...layout];
      updated.splice(insertAt, 0, next);
      persistAndSet(updated);
    },
    [layout, persistAndSet],
  );

  // Bumped on every tap of a widget that has no detail screen. The toast
  // re-runs its show animation each time this value changes.
  const [upcomingToastKey, setUpcomingToastKey] = useState(0);
  const showUpcomingToast = useCallback(() => setUpcomingToastKey(k => k + 1), []);
  // Payslip widget tap opens the bottom-sheet rather than a Detail route.
  const [payslipOpen, setPayslipOpen] = useState(false);
  // Pull-to-refresh state. `bumpRefresh` ticks a global nonce; every
  // `useWidgetData` subscribes to it and force-fetches in parallel. The
  // spinner stays up briefly so the user perceives the refresh happened
  // even if individual widget fetches resolve at different speeds.
  const [refreshing, setRefreshing] = useState(false);
  const bumpRefresh = useRefreshStore(s => s.bump);
  const handlePullToRefresh = useCallback(() => {
    setRefreshing(true);
    bumpRefresh();
    setTimeout(() => setRefreshing(false), 900);
  }, [bumpRefresh]);
  // Measured header height — used to anchor the upcoming-feature toast just
  // below the header instead of at the device top (which would land under
  // the status bar / notch).
  const [headerHeight, setHeaderHeight] = useState(0);

  // Stable renderItem reference so DraggableGrid + memoised WidgetRenderer
  // don't see prop churn on every parent render (e.g. when `editing` flips).
  const renderGridItem = useCallback(
    (item: WidgetConfig) => {
      // Tap behaviour, in order:
      //   - In edit mode → no-op (long-press / reorder wins).
      //   - Payslip → open the payslip bottom-sheet (not a Detail route).
      //   - Widget has a `detail` block in the manifest → navigate to Detail.
      //   - Widget owns its own tap interaction (businessCard's flip) → let
      //     the inner Pressable handle it; outer onPress stays undefined.
      //   - Otherwise → flash the "coming soon" toast so the tap isn't silent.
      const entry = findManifestEntryForWidget(item, manifest);
      const detailEntry = entry?.detail ? entry : undefined;
      const hasOwnTapHandler = item.widgetId === 'businessCard';
      const opensPayslipSheet = item.widgetId === 'payslip';
      const showsToast = !detailEntry && !hasOwnTapHandler && !opensPayslipSheet;
      const handlePress = () => {
        if (editing) return;
        if (opensPayslipSheet) {
          setPayslipOpen(true);
          return;
        }
        if (detailEntry) {
          navigation.navigate('Detail', { appName: detailEntry.appName });
          return;
        }
        if (showsToast) showUpcomingToast();
      };
      const pressActive = !!detailEntry || showsToast || opensPayslipSheet;
      return (
        <Pressable
          onPress={pressActive ? handlePress : undefined}
          style={({ pressed }) => ({ flex: 1, opacity: pressed && pressActive && !editing ? 0.85 : 1 })}>
          <WidgetRenderer config={item} />
        </Pressable>
      );
    },
    [editing, manifest, navigation, showUpcomingToast],
  );

  // Per-tile edit handlers — paired with the disabled JigglingTile / EditChrome
  // below. Restore alongside those if we ever bring back in-grid editing.
  // const handleRemove = useCallback(
  //   (index: number) => persistAndSet(layout.filter((_, i) => i !== index)),
  //   [layout, persistAndSet],
  // );
  //
  // const handleToggleSize = useCallback(
  //   (index: number) => {
  //     const next = layout.map((it, i) =>
  //       i === index
  //         ? {
  //             ...it,
  //             layout: {
  //               ...it.layout,
  //               size: it.layout.size === 'small' ? ('large' as const) : ('small' as const),
  //             },
  //           }
  //         : it,
  //     );
  //     persistAndSet(next);
  //   },
  //   [layout, persistAndSet],
  // );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      {showOfflineBanner ? <OfflineBanner /> : null}
      <View
        onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, paddingTop: headerTopPad },
        ]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: theme.colors.muted, fontWeight: '500' }}>{getGreeting()}</Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.5 }}>
            {user ? `${user.firstName} ${user.lastName}` : ''}
          </Text>
          <Text style={{ fontSize: 13, color: theme.colors.muted, fontWeight: '500' }}>{user?.jobTitle ?? ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {editing ? (
            <Pressable
              onPress={() => setEditing(false)}
              style={{
                backgroundColor: theme.colors.ekRed,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
              }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Done</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => openIdSheet(true)}
            accessibilityLabel="Open employee ID card"
            accessibilityRole="button"
            hitSlop={6}>
            <Avatar size={44} ring />
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor={theme.colors.ekRed}
            colors={[theme.colors.ekRed]}
          />
        }>
        <DraggableGrid
          items={visibleLayout}
          editing={editing}
          onReorder={persistAndSet}
          onLongPressStart={() => setEditing(true)}
          renderItem={renderGridItem}
        />
        {!editing && visibleLayout.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, paddingHorizontal: 24 }}>
            <Icon name="drag" size={12} color={theme.colors.muted} />
            <Text
              style={{
                fontSize: 11,
                color: theme.colors.muted,
                textAlign: 'center',
                fontWeight: '500',
              }}>
              Press and hold any widget to rearrange or add new ones.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <UpcomingFeatureToast triggerKey={upcomingToastKey} topOffset={headerHeight} />
      <PayslipSheet visible={payslipOpen} onClose={() => setPayslipOpen(false)} />
      <WidgetEditDrawer
        visible={editing}
        layout={layout}
        onClose={() => setEditing(false)}
        onAdd={handleAdd}
        onRemove={handleRemoveById}
        onReorder={persistAndSet}
      />
    </View>
  );
};

// Per-tile jiggle + edit chrome are intentionally disabled — editing is
// handled by the WidgetEditDrawer. Re-enable by wrapping each tile with
// <JigglingTile editing={editing}> and rendering <EditChrome ... /> inside
// the renderItem callback above.
//
// const JigglingTile: React.FC<{ editing: boolean; children: React.ReactNode }> = ({ editing, children }) => {
//   const rot = useSharedValue(0);
//   React.useEffect(() => {
//     if (editing) {
//       rot.value = withRepeat(
//         withTiming(0.6, { duration: 140 + Math.random() * 80, easing: Easing.inOut(Easing.ease) }),
//         -1,
//         true,
//       );
//     } else {
//       rot.value = withTiming(0, { duration: 120 });
//     }
//   }, [editing, rot]);
//   const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
//   return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
// };
//
// const EditChrome: React.FC<{ onRemove: () => void; onToggleSize: () => void }> = ({ onRemove, onToggleSize }) => {
//   const theme = useTheme();
//   return (
//     <>
//       <Pressable
//         onPress={onRemove}
//         hitSlop={10}
//         style={{
//           position: 'absolute',
//           top: -6,
//           left: -6,
//           width: 24,
//           height: 24,
//           borderRadius: 12,
//           backgroundColor: theme.colors.ekRed,
//           alignItems: 'center',
//           justifyContent: 'center',
//           shadowColor: '#000',
//           shadowOpacity: 0.2,
//           shadowRadius: 2,
//           shadowOffset: { width: 0, height: 1 },
//           elevation: 4,
//         }}>
//         <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginTop: -2 }}>−</Text>
//       </Pressable>
//       <Pressable
//         onPress={onToggleSize}
//         hitSlop={10}
//         style={{
//           position: 'absolute',
//           top: -6,
//           right: -6,
//           width: 24,
//           height: 24,
//           borderRadius: 12,
//           backgroundColor: theme.colors.ink,
//           alignItems: 'center',
//           justifyContent: 'center',
//           shadowColor: '#000',
//           shadowOpacity: 0.2,
//           shadowRadius: 2,
//           shadowOffset: { width: 0, height: 1 },
//           elevation: 4,
//         }}>
//         <Icon name="arrow-right" size={12} color="white" />
//       </Pressable>
//     </>
//   );
// };

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
