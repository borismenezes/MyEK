/**
 * @myek/sdk — Module Federation build helpers + the cross-bundle TYPE contracts
 * for the MyEK host and remotes.
 *
 * Build side: the shared-singleton package list and version resolution live in
 * `../rspack/shared-versions.mjs` (`SHARED_PACKAGES`, `WORKSPACE_PACKAGES` +
 * `resolveSharedVersions(rootDir)`): versions are read from the installed
 * node_modules at build time by both the host rspack config and the remote
 * builder (`../rspack/remote-config.mjs`), so the share scope can't drift from
 * what's actually bundled. This package does NOT enumerate remotes by name —
 * remote discovery is runtime/catalog-driven (see the host's dynamic-remotes
 * wiring). Mirrors enterprise-app's `@employee-app/sdk` pattern.
 *
 * Type side (below): the widget contract both sides compile against. Types are
 * erased at build time, so this needs no runtime sharing — but it makes payload
 * drift between the host's fetcher and a remote's renderer a COMPILE-TIME
 * failure on whichever side changed, instead of a silent runtime fallback.
 *
 * Contract rule (same as @myek/platform's slots): shapes are ADDITIVE-ONLY.
 * Old remote bundles outlive shell releases via the OTA + LKG caches; never
 * rename/remove/retype an existing field — add optional ones.
 */

import type React from 'react';

/**
 * The slice of the host's per-widget config a remote may rely on. The host's
 * full `WidgetConfig` (src/types/widgets.ts) is a superset — every field here
 * is optional (no index signature: that would break host→sdk assignability).
 * A remote needing a host field not yet mirrored here adds it HERE (optional),
 * not via a local cast.
 */
export interface WidgetConfig {
  widgetId?: string;
  /** Tile size on the home grid. Nested under `layout` in the host shape. */
  size?: 'small' | 'medium' | 'large';
  layout?: { size?: 'small' | 'medium' | 'large' };
  /** Display label for the owning application/service. */
  applicationName?: string;
}

/**
 * Props the host's WidgetRenderer passes to every widget — in-host or
 * federated (the data-via-props contract). `T` is the widget's payload type;
 * each remote narrows it (e.g. `WidgetProps<LeaveBalancePayload>`).
 */
export interface WidgetProps<T = unknown> {
  config: WidgetConfig;
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  onRefresh: () => void;
  preview?: boolean;
}

export type WidgetComponent<T = unknown> = React.ComponentType<WidgetProps<T>>;

/**
 * What a remote's `./widgets` expose default-exports: widgetId → component.
 * The host's FederatedWidget looks its tile up in this map.
 */
export type WidgetExposeMap = Record<string, WidgetComponent<never>>;
