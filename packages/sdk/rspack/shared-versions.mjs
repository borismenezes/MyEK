// Single source of truth for the Module Federation shared-singleton packages.
//
// `SHARED_PACKAGES` names the packages; `resolveSharedVersions(rootDir)` reads
// each one's version from the installed copy under the app root's
// node_modules. Both the host rspack config and the remote builder resolve at
// build time, so the share-scope metadata can't drift from what's actually
// bundled. (Replaces three hand-synced pinned maps, which had already drifted:
// react-native-safe-area-context was pinned 5.5.2 with 5.7.0 installed.)

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export const SHARED_PACKAGES = [
  // React runtime — the federated tree + renderer must be one instance.
  'react',
  'react-native',
  // Navigation — host owns the navigators; remotes mount screens into them, so
  // the navigation context has to be shared.
  '@react-navigation/native',
  '@react-navigation/native-stack',
  '@react-navigation/bottom-tabs',
  'react-native-safe-area-context',
  'react-native-screens',
  // Animation + gestures: a single UI-thread runtime across host + remotes.
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-gesture-handler',
  // Large/native singletons used by both shell and remotes.
  'react-native-svg',
  'react-native-mmkv',
];

/**
 * MyEK workspace singletons. Shared so host + remotes resolve ONE copy at
 * runtime (the host's, registered eagerly); each remote still bundles a
 * fallback copy so it renders standalone (dev server, host predating the
 * package). Versions resolve from the workspace symlinks in node_modules —
 * the same `resolveSharedVersions` path as the npm packages above.
 *
 * @myek/sdk is intentionally absent: it's build tooling + type-only contracts
 * (erased at compile time), nothing to share at runtime.
 */
export const WORKSPACE_PACKAGES = [
  '@myek/platform', // globalThis bridge slots (user/theme/actions)
  '@myek/ui', // theme tokens + shared components
  '@myek/api-client', // shared HTTP client (cross-bundle token-getter)
];

/**
 * Resolve the installed version of every shared package from `rootDir`'s
 * node_modules. Throws when a package can't be resolved — failing the build is
 * better than registering a wrong version in the MF share scope.
 *
 * @param {string} rootDir absolute path of the app root (where node_modules lives)
 * @returns {Record<string, string>} package name → installed version
 */
export function resolveSharedVersions(rootDir) {
  const require = createRequire(path.join(rootDir, 'package.json'));
  const out = {};
  for (const name of SHARED_PACKAGES) {
    out[name] = readVersion(require, rootDir, name);
  }
  return out;
}

/**
 * Resolve the installed version of every workspace singleton (npm workspaces
 * symlink them under node_modules, so the same lookup applies). Kept separate
 * from `resolveSharedVersions` because host and remotes configure the two
 * groups differently (workspace packages keep a bundled fallback in remotes;
 * npm singletons are host-provided `import:false`).
 */
export function resolveWorkspaceVersions(rootDir) {
  const require = createRequire(path.join(rootDir, 'package.json'));
  const out = {};
  for (const name of WORKSPACE_PACKAGES) {
    out[name] = readVersion(require, rootDir, name);
  }
  return out;
}

function readVersion(require, rootDir, name) {
  try {
    return require(`${name}/package.json`).version;
  } catch {
    // Packages whose `exports` map hides package.json land here; with npm's
    // hoisted layout the manifest still sits at a predictable path.
    const manifestPath = path.join(rootDir, 'node_modules', name, 'package.json');
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version;
    } catch (err) {
      throw new Error(
        `[shared-versions] cannot resolve installed version of "${name}" from ${rootDir}: ${err?.message ?? err}`,
      );
    }
  }
}
