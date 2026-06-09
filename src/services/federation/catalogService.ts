import { Platform } from 'react-native';
import { config } from '@/config';
import type { ServiceCatalog, ServiceDefinition } from './types';
import { SHELL_VERSION } from './shellVersion';

/**
 * Fetch the per-app service catalog from the backend Registry:
 *   GET {catalogUrl}?app=myek&platform=ios|android&shellVersion=X
 *
 * Returns the service definitions (each may carry an `mf` block with the
 * runtime-registration coords). The host registers the entitled+compatible
 * subset via `registerCatalogRemotes`.
 *
 * P1 NOTE: not invoked from boot yet (config.mf.enabled === false). P2 wires it
 * into the shell once the backend serves the `myek` app catalog.
 *
 * @param bearer  the caller's auth token (the MF/manifest endpoints are
 *                unauthenticated per ADR-0020, but the *catalog* endpoint is
 *                behind the gateway, so it needs the user's bearer).
 */
export async function fetchServiceCatalog(bearer: string): Promise<ServiceDefinition[]> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const url = `${config.mf.catalogUrl}?app=${encodeURIComponent(
    config.mf.app,
  )}&platform=${platform}&shellVersion=${encodeURIComponent(SHELL_VERSION)}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`[MF] catalog fetch ${res.status} for ${url}`);
  }
  const body = (await res.json()) as ServiceCatalog | ServiceDefinition[];
  // Tolerate either {services:[...]} or a bare array.
  return Array.isArray(body) ? body : body.services ?? [];
}
