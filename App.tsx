/**
 * MyEK · Emirates Group Employee Portal
 *
 * Root component. Responsibilities:
 *  - Wire the API auth interceptors and token-refresh hook (once)
 *  - Hydrate persisted auth/cache from storage on cold start
 *  - Subscribe to NetInfo for online/offline tracking
 *  - Start the offline → online sync manager
 *  - Compose providers (SafeArea, Theme, Gesture, Navigation)
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import RNShake from 'react-native-shake';
import { queryClient } from '@services/queryClient';
import { ThemeProvider, useTheme } from '@theme/index';
import { PlatformBridge } from '@services/federation/PlatformBridge';
import { RootNavigator } from '@navigation/index';
import { SplashScreen } from '@screens/SplashScreen';
import { EmployeeBusinessCard } from '@components/index';
import { hydrateAuth, wireApiAuth, validateAuthConnection } from '@auth/index';
import { startSyncManager } from '@offline/syncManager';
import { useNetworkStatusSync } from '@hooks/useNetworkStatus';
import { widgetService } from '@services/widgetService';
import { widgetLayoutStorage } from '@widgets/index';
import { useAuthStore } from '@store/useAuthStore';
import { useCacheStore } from '@store/useCacheStore';
import { useUIStore } from '@store/useUIStore';
import { createLogger } from '@utils/logger';

const log = createLogger('App');

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Shared QueryClient — singleton across host AND federated remotes
          (@tanstack/react-query is in the MF share scope), so self-fetching
          remote widgets join this cache/dedupe domain. */}
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <Bootstrapper>
              <ThemedStatusBar />
              {/* Publishes user + open-profile to @myek/platform for federated remotes. */}
              <PlatformBridge />
              <RootNavigator />
              {/* Single Employee-ID sheet mounted at app root. Visibility is
                  lifted into useUIStore so the shake-gesture listener below
                  and the existing tap-to-open call sites (HomeScreen,
                  ProfileScreen) all drive the same instance. */}
              <GlobalIdSheet />
              <ShakeListener />
              {/* Branded overlay — sits on top of the React tree from first
                  frame and fades out once auth bootstrap finishes, so the
                  handoff from the native LaunchScreen (red) is seamless and
                  there's no flash of the navigator's plain spinner. */}
              <SplashScreen />
            </Bootstrapper>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

/**
 * One-shot bootstrapper. Side effects only — no UI.
 * Children render once it's done so the navigator decides Login vs Home with
 * the correct auth status from the very first frame.
 */
const Bootstrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const setStatus = useAuthStore(s => s.setStatus);

  // Subscribe to NetInfo and pipe state into the network store.
  useNetworkStatusSync();

  useEffect(() => {
    let cancelled = false;
    let stopSync: (() => void) | null = null;

    (async () => {
      log.info('Bootstrapping');
      setStatus('loading');

      // 1. Wire api → auth dependency once.
      wireApiAuth();

      // 1b. Probe the auth adapter so config issues (bad clientId, tenant,
      //     missing native config) surface as a single log line on boot
      //     instead of a confusing error during the first sign-in attempt.
      validateAuthConnection().catch(() => {});

      // 2. Restore persisted cache so widgets render instantly.
      useCacheStore.getState().hydrate();

      // 3. Try to restore an existing session. The persisted session is
      //    trusted across cold starts — interactive sign-in only runs
      //    when nothing was restored (first launch or after explicit
      //    sign-out). Refresh-token rotation and the 401 interceptor
      //    handle expiry transparently.
      const restored = await hydrateAuth();
      if (cancelled) return;

      // 3b. Kick off prefetch for the top widgets in the background. Fire-
      //     and-forget — we no longer await, so the splash dismisses as
      //     soon as hydrateAuth returns (~10ms from MMKV) instead of
      //     waiting up to the 1.5s prefetch timeout. Tiles render with
      //     skeletons that cross-fade to real content via WidgetShell as
      //     fetches resolve; late results land in the cache and surface
      //     through the normal useWidgetData flow.
      if (restored) {
        const persisted = widgetLayoutStorage.read();
        const layout = persisted && persisted.length > 0
          ? persisted
          : useAuthStore.getState().widgetLayout;
        const TOP_N = 6;
        const top = layout.slice(0, TOP_N);
        void widgetService.prefetch(top, { timeoutMs: 1500 });
      }

      setStatus(restored ? 'authenticated' : 'unauthenticated');

      // 4. Start the sync manager — refreshes widgets on reconnect.
      stopSync = startSyncManager();
    })();

    return () => {
      cancelled = true;
      stopSync?.();
    };
  }, [setStatus]);

  return <>{children}</>;
};

const ThemedStatusBar: React.FC = () => {
  const theme = useTheme();
  return <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />;
};

/**
 * Mounts the Employee-ID bottom sheet at app root. Reads visibility from
 * useUIStore so any caller (tap on profile photo, shake gesture, etc.)
 * can open it without owning local state. Only renders when the user is
 * authenticated — there's nothing to show otherwise, and the sheet pulls
 * from the auth store internally.
 */
const GlobalIdSheet: React.FC = () => {
  const visible = useUIStore(s => s.idSheetVisible);
  const setVisible = useUIStore(s => s.setIdSheetVisible);
  const status = useAuthStore(s => s.status);
  if (status !== 'authenticated') return null;
  return <EmployeeBusinessCard visible={visible} onClose={() => setVisible(false)} />;
};

/**
 * Listens for device shake events and opens the Employee-ID sheet. Uses
 * react-native-shake (UIKit motionEnded on iOS, SensorManager-based
 * accelerometer on Android). Gate on authenticated status so an
 * accidental shake on the login screen doesn't pop an empty sheet.
 */
const ShakeListener: React.FC = () => {
  const setIdSheetVisible = useUIStore(s => s.setIdSheetVisible);
  const status = useAuthStore(s => s.status);
  useEffect(() => {
    if (status !== 'authenticated') return;
    const sub = RNShake.addListener(() => {
      setIdSheetVisible(true);
    });
    return () => sub.remove();
  }, [status, setIdSheetVisible]);
  return null;
};

export default App;
