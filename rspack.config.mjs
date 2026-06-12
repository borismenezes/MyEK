import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import { loadBuildEnv } from './packages/sdk/rspack/load-env.mjs';
import {
  computeCompatToken,
  resolveSharedVersions,
  resolveWorkspaceVersions,
} from './packages/sdk/rspack/shared-versions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build-config-level env (OTA_BASE_URL, MF dev flags). App-level env still flows
// through react-native-dotenv (@env) via babel.config.js at transform time.
loadBuildEnv(__dirname);

// Shared-singleton versions resolved from the installed packages — the host's
// declared share-scope versions always match what it actually bundles. The
// package list lives in packages/sdk/rspack/shared-versions.mjs.
const SHARED_VERSIONS = resolveSharedVersions(__dirname);
// Workspace singletons (@myek/platform, @myek/ui, @myek/api-client): the host
// provides the canonical copy eagerly; remotes carry a fallback (remote-config).
const WORKSPACE_VERSIONS = resolveWorkspaceVersions(__dirname);

function getSharedDependencies({ eager }) {
  const out = {};
  for (const [name, version] of Object.entries({ ...SHARED_VERSIONS, ...WORKSPACE_VERSIONS })) {
    out[name] = { singleton: true, eager, version, requiredVersion: version };
  }
  return out;
}

// Mirror babel module-resolver aliases (src/) into rspack resolve, so module
// resolution is robust whether or not the babel plugin ran for a given file.
const SRC = path.resolve(__dirname, 'src');
const moduleAliases = {
  '@api': path.join(SRC, 'api'),
  '@auth': path.join(SRC, 'auth'),
  '@components': path.join(SRC, 'components'),
  '@widgets': path.join(SRC, 'widgets'),
  '@screens': path.join(SRC, 'screens'),
  '@store': path.join(SRC, 'store'),
  '@hooks': path.join(SRC, 'hooks'),
  '@services': path.join(SRC, 'services'),
  '@utils': path.join(SRC, 'utils'),
  '@offline': path.join(SRC, 'offline'),
  '@types': path.join(SRC, 'types'),
  '@theme': path.join(SRC, 'theme'),
  '@navigation': path.join(SRC, 'navigation'),
  '@config': path.join(SRC, 'config'),
  '@aiAgent': path.join(SRC, 'aiAgent'),
  '@/': SRC + '/',
};

export default Repack.defineRspackConfig(env => {
  const { mode, platform = 'android' } = env;

  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
      // Pin react-native to the single hoisted copy so the Fabric renderer is a
      // true singleton in the bundle.
      alias: {
        'react-native': path.resolve(__dirname, 'node_modules/react-native'),
        ...moduleAliases,
      },
      symlinks: true,
    },
    output: {
      uniqueName: 'myek-host',
      // 'noop:///' makes Re.Pack's ResolverPlugin rebase chunk URLs at runtime;
      // '[name].chunk.bundle' gives chunks predictable filenames.
      chunkFilename: '[name].chunk.bundle',
      publicPath: 'noop:///',
    },
    optimization: {
      // Named chunk ids so the ResolverPlugin's remote-name gate matches.
      chunkIds: 'named',
    },
    module: {
      rules: [
        // App + dep code through Re.Pack's babel-swc-loader. The loader applies
        // babel.config.js (react-native-dotenv → @env, module-resolver aliases,
        // react-native-worklets/plugin for Reanimated) then SWC.
        {
          test: /\.[cm]?[jt]sx?$/,
          type: 'javascript/auto',
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: true,
            options: {},
          },
        },
        ...Repack.getAssetTransformRules(),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({ platform }),
      // Reanimated 4 / worklets transform for rspack (MyEK animates heavily).
      new ReanimatedPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'host',
        dts: false,
        // Remotes are registered at runtime from the per-app catalog
        // (/v1/services/catalog?app=myek) — see src/services/dynamicRemotes.ts.
        // Empty here is what makes remotes deliverable OTA without a host rebuild.
        remotes: {},
        shared: getSharedDependencies({ eager: true }),
        // Resolver swapped for the signing wrapper — verifies each remote
        // chunk's JWT signature (RepackPublicKey from Info.plist/AndroidManifest)
        // before executing it. Absolute path: adaptRuntimePlugins resolves these
        // with no `paths` option.
        defaultRuntimePlugins: [
          '@callstack/repack/mf/core-plugin',
          path.resolve(__dirname, 'packages/sdk/runtime/resolver-with-signing.mjs'),
          '@callstack/repack/mf/prefetch-plugin',
        ],
      }),
      // @react-native-masked-view is optionally required by
      // @react-navigation/elements; MyEK doesn't use it.
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
      // This build's share-scope compat token (opaque hash — see
      // shared-versions.mjs). dynamicRemotes diffs it against each remote
      // manifest's `compat` and emits mf.shared.mismatch telemetry.
      new rspack.DefinePlugin({
        'process.env.MYEK_MF_COMPAT': JSON.stringify(computeCompatToken(__dirname)),
      }),
    ],
  };
});
