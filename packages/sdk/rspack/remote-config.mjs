// Shared rspack config builder for MyEK MF2 remotes.
//
// Each remote's apps/<service>/rspack.config.mjs imports this and calls
// `buildRemoteRspackConfig({ appsDir, serviceId, mfName, uniqueName })` so the
// shared shape (loader rules, shared-deps split, reanimated, exposes) lives in
// one place. Mirrors enterprise-app's builder, MINUS bundle signing / integrity
// (deferred). .mjs so the rspack configs import it without a transpile step.

import path from 'node:path';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import { MfIntegrityPlugin } from './mf-integrity-plugin.mjs';
import { loadBuildEnv } from './load-env.mjs';

// Host-provided singletons (import:false) — the host bundles these eagerly and
// registers the shared scope before any remote loads, so a remote never needs
// its own fallback copy. KEEP IN SYNC with packages/sdk/src/index.ts +
// rspack.config.mjs (host).
const SHARED_VERSIONS_HOST_PROVIDED = {
  react: '19.2.3',
  'react-native': '0.85.2',
  '@react-navigation/native': '7.2.2',
  '@react-navigation/native-stack': '7.14.12',
  '@react-navigation/bottom-tabs': '7.15.11',
  'react-native-safe-area-context': '5.5.2',
  'react-native-screens': '4.24.0',
  'react-native-reanimated': '4.3.0',
  'react-native-worklets': '0.8.1',
  'react-native-gesture-handler': '2.31.1',
  'react-native-svg': '15.15.4',
  'react-native-mmkv': '4.3.1',
};

// MyEK workspace singletons — bundle a small fallback so the singleton getter
// resolves. Empty until the design-system packages (@myek/ui, @myek/platform,
// @myek/api-client) are extracted; remotes are self-contained until then.
const SHARED_VERSIONS_WORKSPACE = {};

function getRemoteSharedDependencies() {
  const out = {};
  for (const [name, version] of Object.entries(SHARED_VERSIONS_HOST_PROVIDED)) {
    out[name] = {
      singleton: true,
      eager: false,
      version,
      requiredVersion: version,
      import: false,
    };
  }
  for (const [name, version] of Object.entries(SHARED_VERSIONS_WORKSPACE)) {
    out[name] = { singleton: true, eager: false, version, requiredVersion: version };
  }
  return out;
}

/**
 * @param {Object} opts
 * @param {string} opts.appsDir   absolute path of the apps/<service>/ dir.
 * @param {string} opts.serviceId kebab-case id; dist/ path + packages/<id>/ dir.
 * @param {string} opts.mfName    MF container name (runtime global + manifest name).
 * @param {string} opts.uniqueName rspack output.uniqueName — must differ from host
 *                                 and every other remote.
 */
export function buildRemoteRspackConfig({ appsDir, serviceId, mfName, uniqueName }) {
  const ROOT = path.resolve(appsDir, '../..');
  const exposesPathScreens = path.posix.join('../..', 'packages', serviceId, 'src/screens/index.ts');
  const exposesPathWidgets = path.posix.join('../..', 'packages', serviceId, 'src/widgets/index.ts');

  loadBuildEnv(ROOT);

  return Repack.defineRspackConfig(env => {
    const { mode, platform = 'android' } = env;
    return {
      mode,
      context: appsDir,
      entry: './src/index.ts',
      resolve: {
        ...Repack.getResolveOptions({ enablePackageExports: true }),
      },
      output: {
        uniqueName,
        path: path.resolve(ROOT, `dist/${platform}/${serviceId}`),
        // Mirror what `react-native bundle` applies via Re.Pack's CLI: 'noop:///'
        // lets the ResolverPlugin rebase chunk URLs at runtime against the OTA
        // entry URL; '[name].chunk.bundle' aligns filenames with the manifest.
        chunkFilename: '[name].chunk.bundle',
        publicPath: 'noop:///',
      },
      optimization: {
        // Named chunk ids so the container chunk id == remote name, which is the
        // condition Re.Pack's ResolverPlugin checks before rebasing chunk URLs.
        chunkIds: 'named',
      },
      module: {
        rules: [
          // Own .ts/.tsx — babel-swc-loader applies babel.config.js
          // (react-native-worklets/plugin for reanimated, etc.) then SWC.
          {
            test: /\.[cm]?tsx?$/,
            type: 'javascript/auto',
            use: { loader: '@callstack/repack/babel-swc-loader', parallel: true, options: {} },
          },
          // Third-party .js/.mjs/.cjs — RN 0.85 ships Flow in .js core sources
          // the SWC parser can't read; force a Babel Flow strip pre-pass.
          {
            test: /\.[cm]?js$/,
            type: 'javascript/auto',
            use: {
              loader: '@callstack/repack/babel-swc-loader',
              parallel: true,
              options: {
                hermesParserOverrides: { flow: 'all' },
                babelOverrides: {
                  plugins: [['@babel/plugin-transform-flow-strip-types', { allowDeclareFields: true }]],
                },
              },
            },
          },
          ...Repack.getAssetTransformRules({ inline: true }),
        ],
      },
      plugins: [
        new Repack.RepackPlugin({ platform }),
        new ReanimatedPlugin(),
        new Repack.plugins.ModuleFederationPluginV2({
          name: mfName,
          filename: `${mfName}.container.js.bundle`,
          dts: false,
          // import:false on react-native means MF won't enumerate its deep
          // submodules; the remote bundles its own tiny copies, while the
          // singleton check on react-native itself still routes to the host.
          reactNativeDeepImports: false,
          exposes: {
            './screens': exposesPathScreens,
            './widgets': exposesPathWidgets,
          },
          shared: getRemoteSharedDependencies(),
          // Resolver swapped for the signing wrapper — injects
          // verifyScriptSignature so the ScriptManager verifies each chunk's JWT.
          // (Absolute path: adaptRuntimePlugins resolves these with no `paths`.)
          defaultRuntimePlugins: [
            '@callstack/repack/mf/core-plugin',
            path.resolve(ROOT, 'packages/sdk/runtime/resolver-with-signing.mjs'),
            '@callstack/repack/mf/prefetch-plugin',
          ],
        }),
        new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
        // Per-chunk SHA-256 into mf-manifest.json so the host can detect a
        // rebuilt remote and evict its (URL-keyed) chunk cache → OTA updates
        // actually reach devices. Must run after the MF plugin emits the manifest.
        new MfIntegrityPlugin(),
        // Sign every remote chunk: Re.Pack appends a JWT (over the chunk hash)
        // using the OTA private key. The host verifies it against the embedded
        // public key at load time. Production builds only (`rspack build`); the
        // dev server (mode==='development') serves unsigned chunks.
        new Repack.plugins.CodeSigningPlugin({
          enabled: mode !== 'development',
          privateKeyPath: path.resolve(ROOT, 'code-signing.pem'),
        }),
      ],
    };
  });
}
