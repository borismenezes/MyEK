import { apiClient, endpoints, versionRegistry } from '@api/index';
import { myekBootstrapToLoginResult, type MyekBootstrapResult } from '@auth/intuneAuth';
import { useAuthStore } from '@store/useAuthStore';
import type { LoginResult } from '@/types';

/**
 * Re-fetches the MyEK BFF bootstrap (apps, widget layout, API versions,
 * permissions). Useful after a deep-link from settings or when the user hits
 * "Refresh". The sign-in flow already returns this data; this service is for
 * warm refreshes without forcing a new SSO ceremony.
 *
 * The bootstrap carries no session (edge-terminated auth — the frontend owns
 * the token), so the existing session is preserved and the raw payload is run
 * through the same projection sign-in uses.
 */
async function refreshBootstrap(): Promise<LoginResult> {
  const session = useAuthStore.getState().session;
  if (!session) {
    throw new Error('homeService.refreshBootstrap: no active session');
  }
  const raw = await apiClient.get<MyekBootstrapResult>(endpoints.home.bootstrap);
  const result = myekBootstrapToLoginResult(raw, session);
  versionRegistry.set(result.apiVersions);
  useAuthStore.getState().bootstrapFromCache(session, result);
  return result;
}

export const homeService = {
  refreshBootstrap,
};
