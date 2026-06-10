import { Platform } from 'react-native';
import { apimClient } from '@api/apimClient';
import { config } from '@/config';
import type { ServiceDefinition } from './types';
import { SHELL_VERSION } from './shellVersion';

/** A catalog widget entry — maps a home widgetId to its owning remote service. */
export interface CatalogWidget {
  id: string;
  serviceId: string;
}

export interface ServiceCatalogResponse {
  services: ServiceDefinition[];
  widgets: CatalogWidget[];
}

/**
 * Fetch the per-app service catalog from the backend Registry (via core):
 *   GET /v1/services/catalog?app=myek&platform=ios|android&shellVersion=X
 *
 * Reuses `apimClient` so the user's bearer is attached automatically (the
 * catalog endpoint is behind the gateway). Returns the service definitions (each
 * may carry an `mf` block) + the widget→service map the host uses to decide
 * which home widgets are federated.
 */
export async function fetchServiceCatalog(): Promise<ServiceCatalogResponse> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const res = await apimClient().get<ServiceCatalogResponse>('/v1/services/catalog', {
    params: { app: config.mf.app, platform, shellVersion: SHELL_VERSION },
  });
  const body = res.data;
  return {
    services: Array.isArray(body?.services) ? body.services : [],
    widgets: Array.isArray(body?.widgets) ? body.widgets : [],
  };
}
