import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import { loadBuildEnv } from './packages/sdk/rspack/load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build-config-level env (OTA_BASE_URL, MF dev flags). App-level env still flows
// through react-native-dotenv (@env) via babel.config.js at transform time.
loadBuildEnv(__dirname);

// Mirror of packages/sdk/src/index.ts SHARED_VERSIONS — a .mjs build file can't
// import the .ts without a transpile step. KEEP IN SYNC with that file.
const SHARED_VERSIONS = {
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

function getSharedDependencies({ eager }) {
  const out = {};
  for (const [name, version] of Object.entries(SHARED_VERSIONS)) {
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
        // Stock runtime plugins — no bundle signing yet (deferred).
        defaultRuntimePlugins: [
          '@callstack/repack/mf/core-plugin',
          '@callstack/repack/mf/resolver-plugin',
          '@callstack/repack/mf/prefetch-plugin',
        ],
      }),
      // @react-native-masked-view is optionally required by
      // @react-navigation/elements; MyEK doesn't use it.
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
    ],
  };
});
