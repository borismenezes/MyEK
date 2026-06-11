import { create } from 'zustand';
import { createLogger } from '@utils/logger';
import { stores, json } from '@utils/storage';
import { fetchServiceCatalog, type ServiceCatalogResponse } from '@services/federation/catalogService';
import {
  EXPOSE_SCREENS,
  EXPOSE_WIDGETS,
  registerCatalogRemotes,
  preloadServiceRemotes,
  resetRegisteredRemotes,
} from '@services/federation/dynamicRemotes';
import { SHELL_VERSION } from '@services/federation/shellVersion';
import type { ServiceDefinition } from '@services/federation/types';

const log = createLogger('Catalog');

// Persisted last-known-good catalog (stale-while-revalidate). Keyed on shell
// version so a shell upgrade never replays a catalog filtered for the old
// version. Lives in the CACHE store: sign-out wipes it via reset(), and a
// compliance cache-wipe takes it too.
const CACHE_KEY = `mf.catalog.v1:${SHELL_VERSION}`;

interface CatalogState {
  /** Services from the app catalog, by id. */
  servicesById: Record<string, ServiceDefinition>;
  /** widgetId → the remote service that provides it (drives federated rendering). */
  widgetToService: Record<string, ServiceDefinition>;
  /** True once a catalog fetch has completed (success or empty). */
  loaded: boolean;
  /** True while the rendered catalog came from the MMKV cache and a revalidate is pending/failed. */
  stale: boolean;
  /**
   * Failure message when the last fetch FAILED — distinct from an authoritative
   * empty catalog (loaded, no error). Lets telemetry/consumers tell "federation
   * is down" from "no federated services configured".
   */
  error: string | null;
  /**
   * Fetch the per-app catalog and populate the maps. Best-effort: on failure
   * (offline / backend down) the last-known-good cache (or empty maps) stays,
   * so every widget renders in-host — the federated path is purely additive.
   */
  load: () => Promise<void>;
  /** Sign-out/account-switch teardown: maps, MMKV cache, MF registrations. */
  reset: () => void;
}

function buildMaps(body: ServiceCatalogResponse): Pick<CatalogState, 'servicesById' | 'widgetToService'> {
  const servicesById: Record<string, ServiceDefinition> = {};
  for (const s of body.services) servicesById[s.id] = s;
  const widgetToService: Record<string, ServiceDefinition> = {};
  for (const w of body.widgets) {
    const svc = servicesById[w.serviceId];
    if (svc?.mf) widgetToService[w.id] = svc; // only federated (has mf coords)
  }
  return { servicesById, widgetToService };
}

/**
 * Pre-register + warm every federated remote the catalog names, so widget/
 * screen `loadExpose` calls don't each pay registration, and tiles reached
 * before their lazy load still resolve. Widget remotes first (home-grid first
 * paint); screen remotes a tick later so they don't contend.
 */
function warmRemotes(services: ServiceDefinition[]): void {
  if (!services.length) return;
  registerCatalogRemotes(services);
  preloadServiceRemotes(services, [EXPOSE_WIDGETS]);
  setTimeout(() => preloadServiceRemotes(services, [EXPOSE_SCREENS]), 0);
}

/** Synchronous LKG hydrate — the home grid flips federated on the first frame
 *  after boot instead of waiting out the catalog roundtrip. */
function hydrateFromCache(): Pick<CatalogState, 'servicesById' | 'widgetToService' | 'stale'> | null {
  const cached = json.get<ServiceCatalogResponse>(stores.cache, CACHE_KEY);
  if (!cached || !Array.isArray(cached.services)) return null;
  return { ...buildMaps(cached), stale: true };
}

const hydrated = hydrateFromCache();
if (hydrated) {
  log.info('catalog hydrated from cache', { services: Object.keys(hydrated.servicesById).length });
  warmRemotes(Object.values(hydrated.servicesById));
}

export const useCatalogStore = create<CatalogState>((set) => ({
  servicesById: hydrated?.servicesById ?? {},
  widgetToService: hydrated?.widgetToService ?? {},
  loaded: false,
  stale: hydrated?.stale ?? false,
  error: null,
  async load() {
    try {
      const body = await fetchServiceCatalog();
      const maps = buildMaps(body);
      set({ ...maps, loaded: true, stale: false, error: null });
      json.set(stores.cache, CACHE_KEY, body);
      warmRemotes(body.services);
      log.info('catalog loaded', {
        services: body.services.length,
        federatedWidgets: Object.keys(maps.widgetToService),
      });
    } catch (e) {
      // Cached/empty maps stay → LKG or in-host everywhere (graceful, additive).
      // Record the failure so a real outage is distinguishable from an
      // authoritative empty catalog.
      const message = e instanceof Error ? e.message : String(e);
      set({ loaded: true, error: message });
      log.warn('mf.catalog.fetch.failed', { message });
    }
  },
  reset() {
    stores.cache.delete(CACHE_KEY);
    resetRegisteredRemotes();
    set({ servicesById: {}, widgetToService: {}, loaded: false, stale: false, error: null });
  },
}));
