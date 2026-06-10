import { create } from 'zustand';
import { createLogger } from '@utils/logger';
import { fetchServiceCatalog } from '@services/federation/catalogService';
import type { ServiceDefinition } from '@services/federation/types';

const log = createLogger('Catalog');

interface CatalogState {
  /** Services from the app catalog, by id. */
  servicesById: Record<string, ServiceDefinition>;
  /** widgetId → the remote service that provides it (drives federated rendering). */
  widgetToService: Record<string, ServiceDefinition>;
  /** True once a catalog fetch has completed (success or empty). */
  loaded: boolean;
  /**
   * Fetch the per-app catalog and populate the maps. Best-effort: on failure
   * (offline / backend down) the maps stay empty, so every widget renders
   * in-host — the federated path is purely additive on top.
   */
  load: () => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  servicesById: {},
  widgetToService: {},
  loaded: false,
  async load() {
    try {
      const { services, widgets } = await fetchServiceCatalog();
      const servicesById: Record<string, ServiceDefinition> = {};
      for (const s of services) servicesById[s.id] = s;
      const widgetToService: Record<string, ServiceDefinition> = {};
      for (const w of widgets) {
        const svc = servicesById[w.serviceId];
        if (svc?.mf) widgetToService[w.id] = svc; // only federated (has mf coords)
      }
      set({ servicesById, widgetToService, loaded: true });
      log.info(`catalog loaded — ${services.length} services, federated widgets: ${Object.keys(widgetToService).join(', ') || '(none)'}`);
    } catch (e) {
      // Leave maps empty → in-host rendering everywhere. Not fatal.
      set({ loaded: true });
      log.warn('catalog fetch failed; widgets render in-host', e);
    }
  },
}));
