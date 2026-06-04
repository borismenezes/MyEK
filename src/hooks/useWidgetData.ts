import { useCallback, useEffect, useRef, useState } from 'react';
import { widgetService } from '@services/widgetService';
import { widgetDefaults } from '@services/defaults';
import { cacheManager } from '@offline/cacheManager';
import { useNetworkStore } from '@store/useNetworkStore';
import { useRefreshStore } from '@store/useRefreshStore';
import type { WidgetConfig } from '@/types';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number;
  isStale: boolean;
}

interface UseWidgetDataReturn<T> extends State<T> {
  refresh: () => Promise<void>;
}

interface UseWidgetDataOptions {
  /**
   * Skip the network fetcher and refresh-on-reconnect listener. Initial
   * state is hydrated synchronously from the widget cache, with the
   * bundled default JSON as a fallback when the cache is empty (e.g. for
   * widgets the user hasn't added yet, surfaced in the edit drawer).
   *
   * Use for read-only preview surfaces — `<WidgetRenderer preview />` —
   * where calling the service would be wasted work and visibly cycles
   * the widget through its loading skeleton on every drawer open.
   */
  skip?: boolean;
}

/**
 * Drives data for a single widget.
 *
 * Lifecycle:
 *  - On mount → kicks off a fetch (cache-first, falls back to network).
 *  - Sets up an interval if `config.refreshIntervalMs` is provided.
 *  - Re-fetches when the network goes offline → online (handled globally by
 *    syncManager, but a defensive mount-time fetch covers screen re-entry).
 */
export function useWidgetData<T>(
  config: WidgetConfig,
  options: UseWidgetDataOptions = {},
): UseWidgetDataReturn<T> {
  const { skip = false } = options;
  const [state, setState] = useState<State<T>>(() => initialState<T>(config, skip));
  // Track mounted state to avoid setting state on unmounted components.
  const mounted = useRef(true);

  const fetcher = useCallback(
    async (force: boolean) => {
      const startedAt = Date.now();
      setState(s => ({ ...s, loading: true }));
      const result = await widgetService.fetch<T>(config, { force });
      if (!mounted.current) return;

      // Hold the loading state for a minimum window so the Skeleton's
      // pulse animation is actually visible. Without this, cache hits
      // resolve in <20ms and users never see the loading shimmer at all,
      // making the data "pop in" rather than transition.
      //
      // Exception: if we got a *fresh* cache hit (warmed by the boot
      // prefetch in App.tsx), skip the artificial delay entirely. The
      // skeleton would just be a regression — data is ready, render it.
      const elapsed = Date.now() - startedAt;
      const MIN_LOADING_MS = result.fromCache && !result.isStale ? 0 : 350;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

      const apply = () => {
        if (!mounted.current) return;
        setState({
          data: result.data,
          loading: false,
          error: result.error,
          fetchedAt: result.fetchedAt,
          isStale: result.isStale,
        });
      };

      if (remaining > 0) setTimeout(apply, remaining);
      else apply();
    },
    // Fetch identity is bound to the cache key inputs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.widgetId, config.apiVersion, config.endpoint, JSON.stringify(config.params)],
  );

  // Initial + interval fetch. When `skip` is set the widget is in preview
  // mode (edit drawer): initial state is already populated from cache, so
  // we don't fire a service call or set up a refresh interval at all.
  useEffect(() => {
    mounted.current = true;
    if (skip) {
      return () => {
        mounted.current = false;
      };
    }
    fetcher(false);
    if (config.refreshIntervalMs && config.refreshIntervalMs > 0) {
      const id = setInterval(() => fetcher(false), config.refreshIntervalMs);
      return () => {
        mounted.current = false;
        clearInterval(id);
      };
    }
    return () => {
      mounted.current = false;
    };
  }, [fetcher, config.refreshIntervalMs, skip]);

  // Refetch when we transition offline → online (post-mount). Skipped in
  // preview mode for the same reason as the mount fetch.
  const wasOnlineRef = useRef<boolean>(useNetworkStore.getState().isConnected);
  useEffect(() => {
    if (skip) return;
    return useNetworkStore.subscribe(net => {
      const onlineNow = net.isConnected && net.isInternetReachable !== false;
      if (!wasOnlineRef.current && onlineNow) fetcher(true);
      wasOnlineRef.current = onlineNow;
    });
  }, [fetcher, skip]);

  // Pull-to-refresh: HomeScreen bumps a global nonce when the user drags
  // the grid down. Each widget subscribes here and force-refetches when
  // the nonce ticks. Skipped in preview mode and on the initial mount
  // (nonce starts at 0).
  const refreshNonce = useRefreshStore(s => s.nonce);
  useEffect(() => {
    if (skip) return;
    if (refreshNonce === 0) return;
    fetcher(true);
  }, [refreshNonce, fetcher, skip]);

  const refresh = useCallback(() => fetcher(true), [fetcher]);

  return { ...state, refresh };
}

/**
 * Compute the initial state for the hook.
 *
 *  - Live mode (skip=false): start with `loading: true, data: null` and let
 *    the mount-time fetcher fill in the data.
 *  - Preview mode (skip=true): hydrate synchronously from the widget cache
 *    (populated whenever the same widget rendered live on the home grid),
 *    falling back to the bundled default JSON when nothing is cached. We
 *    flip `loading` to false immediately so the WidgetShell skeleton never
 *    flashes — opening the edit drawer should feel instant, not lag.
 */
function initialState<T>(config: WidgetConfig, skip: boolean): State<T> {
  if (!skip) {
    return { data: null, loading: true, error: null, fetchedAt: 0, isStale: false };
  }
  const cached = cacheManager.read<T>(config);
  if (cached) {
    return {
      data: cached.data,
      loading: false,
      error: null,
      fetchedAt: cached.fetchedAt,
      isStale: cached.isStale,
    };
  }
  const fallback = (widgetDefaults[config.widgetId] as T | undefined) ?? null;
  return { data: fallback, loading: false, error: null, fetchedAt: 0, isStale: false };
}
