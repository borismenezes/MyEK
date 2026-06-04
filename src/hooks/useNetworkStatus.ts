import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '@store/useNetworkStore';

/**
 * Subscribes to NetInfo and pipes connectivity changes into useNetworkStore.
 * Call once at app root.
 */
export function useNetworkStatusSync(): void {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      useNetworkStore.getState().set({
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });
    return unsubscribe;
  }, []);
}

/** Convenience selector hook used by components/banners. */
export function useIsOnline(): boolean {
  return useNetworkStore(s => s.isConnected && s.isInternetReachable !== false);
}
