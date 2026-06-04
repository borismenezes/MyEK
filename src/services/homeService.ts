import { apiClient, endpoints, versionRegistry } from '@api/index';
import { useAuthStore } from '@store/useAuthStore';
import type { LoginResult } from '@/types';

/**
 * Re-fetches the home bootstrap (apps, widget layout, API versions).
 * Useful after a deep-link from settings or when the user hits "Refresh".
 *
 * The login flow already returns this data; this service is for warm refreshes
 * without forcing a new SSO ceremony.
 */
async function refreshBootstrap(): Promise<LoginResult> {
  const result = await apiClient.get<LoginResult>(endpoints.home.bootstrap);
  versionRegistry.set(result.apiVersions);
  // Splice into the auth store, preserving the existing session/tokens.
  const session = useAuthStore.getState().session;
  if (session) useAuthStore.getState().bootstrapFromCache(session, result);
  return result;
}

export const homeService = {
  refreshBootstrap,
};
