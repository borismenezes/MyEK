import { create } from 'zustand';
import type { NetworkState } from '@/types';

interface NetworkActions {
  set(state: Partial<NetworkState>): void;
}

const initial: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: null,
  lastOnlineAt: Date.now(),
};

/**
 * Network store. Updated by `useNetworkStatus` (subscribes to NetInfo)
 * and read by the OfflineBanner + cache fall-back logic.
 */
export const useNetworkStore = create<NetworkState & NetworkActions>(set => ({
  ...initial,
  set(next) {
    set(state => {
      const wasOffline = !state.isConnected || state.isInternetReachable === false;
      const merged = { ...state, ...next };
      const isOnline = merged.isConnected && merged.isInternetReachable !== false;
      if (wasOffline && isOnline) merged.lastOnlineAt = Date.now();
      return merged;
    });
  },
}));
