// API-surface snapshots for the cross-bundle contract packages.
//
// The @myek/{sdk,platform,api-client,ui} surfaces are wire protocols: old
// remote bundles outlive shell releases, so changes must be ADDITIVE-ONLY
// (see packages/platform/src/index.ts). Comments can't enforce that — this
// does: `--write` regenerates the .d.ts snapshots under etc/api-surface/,
// and `--check` (CI, `npm run verify:api-surface`) fails when the emitted
// declarations differ from the committed snapshots, forcing every surface
// change to show up as a reviewable snapshot diff in the same PR.
//
// Lightweight equivalent of api-extractor's report files — no extra deps.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_DIR = path.join(ROOT, 'etc', 'api-surface');
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

/** Contract packages whose public surface is snapshotted (src/ only). */
const PACKAGES = ['sdk', 'platform', 'api-client', 'ui'];

const mode = process.argv[2];
if (mode !== '--write' && mode !== '--check') {
  console.error('usage: node scripts/api-surface.mjs --write | --check');
  process.exit(2);
}

function emitDeclarations(pkg, outDir) {
  const tmpConfig = path.join(os.tmpdir(), `myek-api-${pkg}-${process.pid}.json`);
  fs.writeFileSync(
    tmpConfig,
    JSON.stringify({
      extends: path.join(ROOT, 'tsconfig.json'),
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        declarationDir: outDir,
        rootDir: path.join(ROOT, 'packages', pkg, 'src'),
        // No ambient @types (the root config pulls in jest, absent here)…
        types: [],
      },
      // …but react-native's globals (fetch, AbortController, __DEV__) must be
      // in the program explicitly — a package that doesn't import react-native
      // (api-client) would otherwise lose them. The entry d.ts /// -references
      // src/types/globals.d.ts.
      files: [path.join(ROOT, 'node_modules', 'react-native', 'types', 'index.d.ts')],
      include: [path.join(ROOT, 'packages', pkg, 'src')],
    }),
  );
  try {
    execFileSync(process.execPath, [TSC, '-p', tmpConfig], { stdio: 'inherit' });
  } finally {
    fs.rmSync(tmpConfig, { force: true });
  }
}

/** Flat {relativePath: contents} map of every .d.ts under dir. */
function readSurface(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const p = path.join(dir, String(entry));
    if (fs.statSync(p).isFile() && p.endsWith('.d.ts')) {
      out[String(entry)] = fs.readFileSync(p, 'utf8');
    }
  }
  return out;
}

let failed = false;
for (const pkg of PACKAGES) {
  const snapshotPkgDir = path.join(SNAPSHOT_DIR, pkg);
  if (mode === '--write') {
    fs.rmSync(snapshotPkgDir, { recursive: true, force: true });
    emitDeclarations(pkg, snapshotPkgDir);
    console.log(`[api-surface] wrote ${path.relative(ROOT, snapshotPkgDir)}`);
    continue;
  }
  // --check: emit fresh, compare with committed snapshot.
  const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), `myek-api-${pkg}-`));
  try {
    emitDeclarations(pkg, freshDir);
    const fresh = readSurface(freshDir);
    const committed = readSurface(snapshotPkgDir);
    const files = new Set([...Object.keys(fresh), ...Object.keys(committed)]);
    for (const f of files) {
      if (fresh[f] === committed[f]) continue;
      failed = true;
      const state = !committed[f] ? 'added' : !fresh[f] ? 'removed' : 'changed';
      console.error(`[api-surface] @myek/${pkg} surface ${state}: ${f}`);
    }
  } finally {
    fs.rmSync(freshDir, { recursive: true, force: true });
  }
}

if (failed) {
  console.error(
    '\n[api-surface] contract package surface changed. If the change is intentional ' +
      '(and ADDITIVE — see packages/platform/src/index.ts contract rules), run ' +
      '`npm run api-surface:write` and commit the snapshot diff in the same PR.',
  );
  process.exit(1);
}
console.log('[api-surface] all contract surfaces match their snapshots');
