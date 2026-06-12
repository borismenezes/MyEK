#!/usr/bin/env node
/* eslint-env node */
// MyEK service generator — the paved road for a new federated mini-app.
//
//   node scripts/generate-service.mjs <service-id> [--dry-run]
//
// Scaffolds the COMPLETE team-owned surface of a new service:
//   packages/<id>/   workspace package: types, self-fetching api.ts, widget +
//                    screen stubs, fixture, contract test
//   apps/<id>/       MF2 remote build wrapper (rspack config via @myek/sdk,
//                    dev-server port auto-assigned)
// …and nothing else: no host files are touched, by design. The host discovers
// the service from the backend catalog at runtime. Remaining steps (build,
// publish, backend manifest) are in docs/adding-a-service.md.
//
// The templates embody the CANONICAL patterns — self-fetching data via
// @myek/api-client + the shared QueryClient, contract types from @myek/sdk,
// theme via @myek/ui, and a contract test so governance is the default, not
// a checklist. Mirrors enterprise-app's generator.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Arguments ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2).filter(a => a !== '--dry-run');
const dryRun = process.argv.includes('--dry-run');
const serviceId = args[0];

if (!serviceId || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(serviceId)) {
  console.error('usage: node scripts/generate-service.mjs <service-id> [--dry-run]');
  console.error('       <service-id> is kebab-case, e.g. "expense-claims"');
  process.exit(2);
}
if (fs.existsSync(path.join(ROOT, 'packages', serviceId))) {
  console.error(`[generate-service] packages/${serviceId} already exists`);
  process.exit(1);
}

// Naming forms: expense-claims → expense_claims (MF remote name; dots/dashes
// are not valid JS identifiers in the MF container global), expenseClaims
// (widgetId), ExpenseClaims (components).
const snake = serviceId.replace(/-/g, '_');
const camel = serviceId.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = camel[0].toUpperCase() + camel.slice(1);

// Next free dev-server port: scan existing apps' start scripts (9001…).
function nextPort() {
  const used = new Set();
  const appsDir = path.join(ROOT, 'apps');
  for (const dir of fs.existsSync(appsDir) ? fs.readdirSync(appsDir) : []) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(appsDir, dir, 'package.json'), 'utf8'));
      const m = (pkg.scripts?.start ?? '').match(/--port (\d+)/);
      if (m) used.add(Number(m[1]));
    } catch {
      /* not an app dir */
    }
  }
  let port = 9001;
  while (used.has(port)) port++;
  return port;
}
const port = nextPort();

// ── Templates ────────────────────────────────────────────────────────────────

const files = {
  // ---- workspace package -----------------------------------------------------
  [`packages/${serviceId}/package.json`]: `${JSON.stringify(
    {
      name: `@myek/${serviceId}`,
      version: '0.1.0',
      private: true,
      description: `MyEK ${serviceId} mini-app — federated screens + widgets.`,
      main: 'src/index.ts',
      types: 'src/index.ts',
      exports: { '.': './src/index.ts' },
      dependencies: {
        '@myek/api-client': '*',
        '@myek/sdk': '*',
        '@myek/ui': '*',
        '@tanstack/react-query': '^5.101.0',
      },
    },
    null,
    2,
  )}\n`,

  [`packages/${serviceId}/src/index.ts`]: `export * from './types';
export { default as screens } from './screens';
export { default as widgets } from './widgets';
`,

  [`packages/${serviceId}/src/types.ts`]: `/**
 * Widget contract comes from @myek/sdk — the cross-bundle type contract shared
 * with the host (compile-time only; types are erased). Payload types below are
 * this remote's own.
 */
export type { WidgetConfig, WidgetProps, WidgetComponent } from '@myek/sdk';

/** Payload of GET /v1/myek/${serviceId}/widget — keep in sync with the BFF. */
export interface ${pascal}Payload {
  // TODO(${serviceId}): replace with the real widget payload shape.
  headline: string;
}
`,

  [`packages/${serviceId}/src/api.ts`]: `import { apiGet } from '@myek/api-client';
import type { ${pascal}Payload } from './types';

/**
 * The ${serviceId} remote's own BFF calls — the self-fetching contract: this
 * remote, not the host, owns which endpoints it talks to. Auth + base URL come
 * from the @myek/api-client globalThis slots the host wires at sign-in.
 */
export const ${camel.toUpperCase()}_QUERY_KEYS = {
  widget: ['myek', '${serviceId}', 'widget'] as const,
};

export function fetch${pascal}Widget(): Promise<${pascal}Payload> {
  return apiGet<${pascal}Payload>('/v1/myek/${serviceId}/widget');
}
`,

  [`packages/${serviceId}/src/widgets/${pascal}Widget.tsx`]: `import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme, widgetTheme, WidgetErrorState } from '@myek/ui';
import { fetch${pascal}Widget, ${camel.toUpperCase()}_QUERY_KEYS } from '../api';
import type { ${pascal}Payload, WidgetProps } from '../types';

/**
 * ${pascal} home tile. Self-fetching: owns its data via api.ts + the host's
 * shared QueryClient. \`props.data\` stays as the cross-version fallback (a
 * shell that still host-feeds this widget keeps working).
 */
export const ${pascal}Widget: React.FC<WidgetProps<${pascal}Payload>> = ({ config, data: hostData }) => {
  const theme = useTheme();
  const query = useQuery({
    queryKey: ${camel.toUpperCase()}_QUERY_KEYS.widget,
    queryFn: fetch${pascal}Widget,
    refetchInterval: config?.refreshIntervalMs ?? false,
  });
  const data = query.data ?? hostData;
  if (!data) {
    // Self-fetch failed with no host-fed fallback: surface it — a blank tile
    // on outage is silent degradation (no-silent-fallback rule).
    if (query.isError) return <WidgetErrorState onRetry={() => void query.refetch()} />;
    return null; // initial query tick — data or error arrives next render
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.titleMd,
          fontWeight: widgetTheme.fontWeight.bold,
          color: theme.colors.ink,
        }}>
        {data.headline}
      </Text>
    </View>
  );
};
`,

  [`packages/${serviceId}/src/widgets/index.ts`]: `import type { WidgetExposeMap } from '@myek/sdk';
import { ${pascal}Widget } from './${pascal}Widget';

/**
 * Widgets exposed by the \`${snake}\` remote, keyed by widgetId. The host
 * looks tiles up in this map (federated as \`./widgets\`).
 */
const widgets: WidgetExposeMap = {
  ${camel}: ${pascal}Widget,
};

export default widgets;
`,

  [`packages/${serviceId}/src/screens/${pascal}Screen.tsx`]: `import React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@myek/ui';

/** ${pascal} detail screen — the remote's \`./screens\` expose, mounted by the host. */
export default function ${pascal}Screen(): React.ReactElement {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.ink }}>${pascal}</Text>
        <View style={{ padding: 16, borderRadius: 14, backgroundColor: theme.colors.surface }}>
          <Text style={{ fontSize: 14, color: theme.colors.ink }}>
            Federated remote · ${snake}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
`,

  [`packages/${serviceId}/src/screens/index.ts`]: `export { default } from './${pascal}Screen';
`,

  [`packages/${serviceId}/src/__fixtures__/${camel}.json`]: `${JSON.stringify(
    { headline: `${pascal} works` },
    null,
    2,
  )}\n`,

  [`packages/${serviceId}/src/widgets/__tests__/widgets.contract.test.tsx`]: `/**
 * Widget contract test — renders every widget this remote exposes against its
 * recorded fixture payload, exactly as the host mounts it. Breaks in CI when
 * a payload-shape or props-contract change would break the published tile.
 */
import { renderWidget, renderWidgetSelfFetchError } from '@myek/sdk/testing';
import widgets from '../index';
import ${camel}Fixture from '../../__fixtures__/${camel}.json';

const fixtures: Record<string, unknown> = {
  ${camel}: ${camel}Fixture,
};

describe('${serviceId} remote widget contract', () => {
  it('exposes at least one widget', () => {
    expect(Object.keys(widgets).length).toBeGreaterThan(0);
  });

  it.each(Object.keys(widgets))('renders "%s" with its fixture at both sizes', widgetId => {
    const fixture = fixtures[widgetId];
    expect(fixture).toBeDefined(); // every exposed widget must have a recorded fixture
    const renderers = renderWidget(widgets[widgetId], fixture as never, {
      config: { widgetId, applicationName: '${serviceId}' },
    });
    for (const r of renderers) {
      expect(r.toJSON()).not.toBeNull();
    }
  });

  // Self-fetching contract: with no payload anywhere (own query fails, no
  // host-fed fallback), the tile must surface an error state — a null render
  // here is the silent blank-tile-on-outage failure mode.
  it.each(Object.keys(widgets))('renders an error state for "%s" when its own fetch fails', async widgetId => {
    const renderer = await renderWidgetSelfFetchError(widgets[widgetId], {
      config: { widgetId, applicationName: '${serviceId}' },
    });
    expect(renderer.toJSON()).not.toBeNull();
  });
});
`,

  // ---- remote build wrapper ---------------------------------------------------
  [`apps/${serviceId}/package.json`]: `${JSON.stringify(
    {
      name: `@myek/${serviceId}-remote`,
      version: '0.1.0',
      private: true,
      description: `Module Federation v2 remote build artifact for the MyEK ${serviceId} mini-app.`,
      scripts: {
        'build:mf': 'rspack build --config rspack.config.mjs --env platform=android',
        'build:mf:ios': 'rspack build --config rspack.config.mjs --env platform=ios',
        start: `react-native start --port ${port} --host 0.0.0.0 --platform ios`,
        'start:android': `react-native start --port ${port} --host 0.0.0.0 --platform android`,
      },
      dependencies: { [`@myek/${serviceId}`]: '*' },
      devDependencies: {
        '@myek/sdk': '*',
        '@callstack/repack': '5.2.5',
        '@callstack/repack-plugin-reanimated': '5.2.5',
        '@module-federation/enhanced': '2.3.1',
        '@rspack/cli': '1.7.11',
        '@rspack/core': '1.7.11',
      },
    },
    null,
    2,
  )}\n`,

  [`apps/${serviceId}/rspack.config.mjs`]: `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRemoteRspackConfig } from '@myek/sdk/rspack/remote-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildRemoteRspackConfig({
  appsDir: __dirname,
  serviceId: '${serviceId}',
  mfName: '${snake}',
  uniqueName: 'myek-${serviceId}',
});
`,

  [`apps/${serviceId}/react-native.config.js`]: `module.exports = {
  // Routes \`react-native start\` (the remote dev server) to Re.Pack so the host
  // can load this remote from localhost during development.
  commands: require('@callstack/repack/commands/rspack'),
};
`,

  [`apps/${serviceId}/src/index.ts`]: `// MF2 remote entry for the ${serviceId} mini-app. The exposed modules
// (./screens, ./widgets) are wired in apps/${serviceId}/rspack.config.mjs via
// the shared remote builder; this entry just re-exports the workspace package.
export * from '@myek/${serviceId}';
`,
};

// ── Write ────────────────────────────────────────────────────────────────────

for (const [rel, content] of Object.entries(files)) {
  const abs = path.join(ROOT, rel);
  if (dryRun) {
    console.log(`[dry-run] would write ${rel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  console.log(`created ${rel}`);
}

console.log(`
Scaffolded "${serviceId}" (remote name: ${snake}, widgetId: ${camel}, dev port: ${port}).

Next steps (docs/adding-a-service.md has the full golden path):
  1. npm install                              # link the new workspace packages
  2. Implement the payload type, api.ts endpoint, widget + screen.
  3. npm run verify                           # contract test runs with the suite
  4. cd apps/${serviceId} && npm run build:mf && npm run build:mf:ios
  5. Publish dist/<platform>/${serviceId}/ to the OTA service.
  6. Backend: add the service (+ widget mapping, selfFetching: true) to the
     myek app catalog. The host discovers it on the next catalog load —
     no host release.
`);
