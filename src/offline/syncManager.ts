import { useNetworkStore } from '@store/useNetworkStore';
import { useAuthStore } from '@store/useAuthStore';
import { widgetService } from '@services/widgetService';
import { createLogger } from '@utils/logger';

const log = createLogger('Offline/Sync');

/**
 * Subscribes to network state and, on transition from offline → online,
 * refreshes every visible widget. Returns an unsubscribe function.
 */
export function startSyncManager(): () => void {
  let wasOnline = isOnline();

  return useNetworkStore.subscribe(state => {
    const onlineNow = state.isConnected && state.isInternetReachable !== false;
    if (!wasOnline && onlineNow) {
      log.info('Network restored — refreshing widgets');
      refreshAllVisibleWidgets().catch(e => log.warn('Sync failed', e));
    }
    wasOnline = onlineNow;
  });
}

function isOnline() {
  const s = useNetworkStore.getState();
  return s.isConnected && s.isInternetReachable !== false;
}

async function refreshAllVisibleWidgets() {
  const layout = useAuthStore.getState().widgetLayout;
  await Promise.allSettled(layout.map(cfg => widgetService.fetch(cfg, { force: true })));
}
