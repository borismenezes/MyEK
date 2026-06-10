/**
 * @myek/sdk — single source of truth for Module Federation shared-dependency
 * versions. Consumed by the host (`getSharedDependencies({ eager: true })`) and
 * by every remote's build (`getSharedDependencies({ eager: false })` via the
 * remote-config builder). This module does NOT enumerate remotes by name —
 * remote discovery is runtime/catalog-driven (see the host's dynamic-remotes
 * wiring). Mirrors enterprise-app's `@employee-app/sdk` pattern.
 *
 * KEEP IN SYNC with the duplicated copy in the host `rspack.config.mjs` (a .mjs
 * build file can't import this .ts without a transpile step).
 *
 * Versions are pinned to MyEK's resolved versions — host + remotes must agree
 * exactly so MF resolves a single (host-provided, eager) instance of each.
 */
export const SHARED_VERSIONS: Record<string, string> = {
  // React runtime — the federated tree + renderer must be one instance.
  react: '19.2.3',
  'react-native': '0.85.2',
  // Navigation — host owns the navigators; remotes mount screens into them, so
  // the navigation context has to be shared.
  '@react-navigation/native': '7.2.2',
  '@react-navigation/native-stack': '7.14.12',
  '@react-navigation/bottom-tabs': '7.15.11',
  'react-native-safe-area-context': '5.5.2',
  'react-native-screens': '4.24.0',
  // Animation + gestures: a single UI-thread runtime across host + remotes.
  'react-native-reanimated': '4.3.0',
  'react-native-worklets': '0.8.1',
  'react-native-gesture-handler': '2.31.1',
  // Large/native singletons used by both shell and remotes.
  'react-native-svg': '15.15.4',
  'react-native-mmkv': '4.3.1',
  // MyEK workspace singletons — added as each package lands in P0/P1:
  //   '@myek/ui':       theme tokens + shared components
  //   '@myek/platform': shell/auth context (the singleton remotes bind to)
  //   '@myek/api-client': shared HTTP client (cross-bundle token-getter)
  // (Listed here once created so remotes consume the host's eager copy.)
};

export interface SharedDescriptor {
  singleton: true;
  eager: boolean;
  version: string;
  requiredVersion: string;
}

/**
 * Build the Module Federation `shared` map. Host calls with `{ eager: true }`
 * (bundles the singletons up front); remotes call with `{ eager: false }`
 * (consume the host's instance at runtime).
 */
export function getSharedDependencies({
  eager,
}: {
  eager: boolean;
}): Record<string, SharedDescriptor> {
  const out: Record<string, SharedDescriptor> = {};
  for (const [name, version] of Object.entries(SHARED_VERSIONS)) {
    out[name] = { singleton: true, eager, version, requiredVersion: version };
  }
  return out;
}
