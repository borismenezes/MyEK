/**
 * Catalog / Module-Federation types for the MyEK micro-frontend host.
 *
 * The backend Registry serves a per-app catalog
 * (`GET /v1/services/catalog?app=myek&platform=…`). Each entry carries an
 * optional `mf` block with the runtime-registration coordinates. Mirrors the
 * `CatalogView.MfView` wire shape from `libs/manifest-common`.
 */

export type EntityStatus = 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED';
export type Surface = 'HOME' | 'SERVICES_TAB' | 'AI_TAB';

/** Module-Federation coordinates carried by a catalog service entry. */
export interface ServiceMfCoords {
  /** MF2 container name (app-scoped, so a plain id like `leave` is fine). */
  remoteName: string;
  /** Absolute manifest URL resolved by the backend for the requesting platform. */
  manifestUrl: string;
  /** Reserved expose keys → the path each remote exposed. */
  exposes: {
    /** Default-exported screen/navigator mounted by the host. */
    screens?: string;
    /** `Record<widgetId, WidgetComponent>` merged into the host widget registry. */
    widgets?: string;
    settings?: string;
  };
  /** Content hash for last-known-good cache keying / re-registration. */
  bundleHash?: string;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  icon: string;
  version: string;
  /** Optional on the wire — a service without it is loadable by any shell. */
  minShellVersion?: string;
  status: EntityStatus;
  surfaces: Surface[];
  description?: string;
  /** Present when the service is delivered as a runtime-registered MF2 remote. */
  mf?: ServiceMfCoords;
}

export interface ServiceCatalog {
  services: ServiceDefinition[];
}
