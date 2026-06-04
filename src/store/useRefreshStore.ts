import { create } from 'zustand';

interface RefreshState {
  /**
   * Monotonically-increasing counter. Every consumer of widget data
   * subscribes to this value; an increment is the signal to force-refetch.
   * Starts at 0 so initial mounts don't accidentally treat it as a refresh
   * trigger — the bump from the pull-to-refresh gesture is the first
   * meaningful value.
   */
  nonce: number;
  /** Bump the nonce, broadcasting a "refresh all widgets" intent. */
  bump(): void;
}

/**
 * Tiny pub/sub for "pull to refresh" on the home grid. HomeScreen calls
 * `bump()` when the user drags the grid down; every `useWidgetData`
 * subscribes to `nonce` and forces a network fetch when it ticks.
 */
export const useRefreshStore = create<RefreshState>(set => ({
  nonce: 0,
  bump() {
    set(s => ({ nonce: s.nonce + 1 }));
  },
}));
