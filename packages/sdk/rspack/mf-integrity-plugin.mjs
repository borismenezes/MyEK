// MF2 manifest integrity plugin.
//
// The stock `mf-manifest.json` lists a remote's chunk filenames but carries no
// integrity data. This plugin runs late in the asset pipeline, computes a
// SHA-256 over every emitted `.bundle` (container entry + chunks), and writes an
// `integrity` map into the manifest keyed by bare filename.
//
// Why MyEK needs it now: Re.Pack chunk filenames are deterministic, so a rebuilt
// remote keeps the same chunk URLs. The host's ScriptManager caches chunks by
// URL, so without a change signal it would serve stale chunks forever. The
// host's manifest-cache runtime plugin diffs this `integrity` map across cold
// starts and evicts the chunk cache when it changes — that's what makes an OTA
// remote update actually reach the device on the next launch.
//
// Format: `sha256-<base64>` (the SRI convention). This map is a CHANGE SIGNAL,
// not a security control — tamper-resistance comes from per-chunk JWT signing
// (CodeSigningPlugin in remote-config.mjs, verified on device by the
// resolver-with-signing runtime plugin).

import { createHash } from 'node:crypto';
import rspack from '@rspack/core';

const PLUGIN_NAME = 'MfIntegrityPlugin';
const MANIFEST_NAME = 'mf-manifest.json';

export class MfIntegrityPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.processAssets.tap(
        { name: PLUGIN_NAME, stage: rspack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
        assets => {
          const manifestAsset = assets[MANIFEST_NAME];
          if (!manifestAsset) return; // not an MF build

          let manifest;
          try {
            manifest = JSON.parse(manifestAsset.source().toString());
          } catch (err) {
            compilation.errors.push(
              new Error(`[${PLUGIN_NAME}] could not parse ${MANIFEST_NAME}: ${err?.message ?? err}`),
            );
            return;
          }

          const integrity = {};
          for (const [name, asset] of Object.entries(assets)) {
            if (!name.endsWith('.bundle') || name.endsWith('.bundle.map')) continue;
            const buffer = asset.buffer ? asset.buffer() : Buffer.from(asset.source());
            integrity[name] = 'sha256-' + createHash('sha256').update(buffer).digest('base64');
          }

          manifest.integrity = integrity;
          compilation.updateAsset(
            MANIFEST_NAME,
            new rspack.sources.RawSource(JSON.stringify(manifest, null, 2)),
          );
        },
      );
    });
  }
}
