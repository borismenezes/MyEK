import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { useAuthStore } from '@store/useAuthStore';
import { createLogger } from '@utils/logger';
import manifestDefault from './defaults/applicationsManifest.json';
import type { AppManifestEntry } from '@/types';

const log = createLogger('Service/AppsManifest');

/**
 * Fetches the per-user applications manifest from APIM — the list of apps
 * enabled for the signed-in user, paired with the widget template each one
 * should render in (`widgetId`) and the default size (`small` / `large`).
 *
 * After the network response lands we overlay the bundled JSON's `detail`
 * blocks onto entries that don't carry one. The bundled file acts as the
 * **UI binding** source of truth (which detail layout to open, which
 * endpoint the detail surface hits) — useful while the backend manifest
 * is catching up. Anything the backend does send through (`enabled`,
 * `widgetName`, top-level `endpoint`, …) wins, so flipping a flag remotely
 * still works without a release.
 *
 * Falls back to the bundled JSON wholesale when the backend is unreachable.
 */
async function fetchManifest(): Promise<AppManifestEntry[]> {
  const employeeId = useAuthStore.getState().user?.employeeId;
  if (!employeeId) {
    log.warn('No signed-in employeeId — using bundled default');
    return manifestDefault as AppManifestEntry[];
  }
  try {
    const path = buildPath(config.apim.paths.applicationsManifest, { employeeId });
    const res = await apimClient().get<AppManifestEntry[]>(path);
    const data = res.data;
    if (Array.isArray(data) && data.length > 0) return overlayDetailBlocks(data);
    log.warn('Manifest empty — using bundled default');
    return manifestDefault as AppManifestEntry[];
  } catch (e) {
    log.warn('Manifest fetch failed — using bundled default', e);
    return manifestDefault as AppManifestEntry[];
  }
}

/**
 * Reconcile the API manifest against the bundled defaults:
 *
 *   1. For every API entry, if it lacks a `detail` block but the bundled
 *      JSON has one for the same `appName`, copy `detail` over.
 *   2. For every bundled entry that the API doesn't list at all, append
 *      it verbatim. This lets us add a new app/detail surface client-side
 *      (Jira widget, attendance detail, …) without waiting for the
 *      backend manifest to catch up.
 *
 * API data wins on every other field — `enabled`, `widgetName`, top-level
 * `endpoint`, `applicationName` — so flipping a flag remotely still works.
 */
function overlayDetailBlocks(apiEntries: AppManifestEntry[]): AppManifestEntry[] {
  const bundled = manifestDefault as AppManifestEntry[];
  const bundledByName = new Map(bundled.map(e => [e.appName, e]));
  const apiNames = new Set(apiEntries.map(e => e.appName));

  const merged: AppManifestEntry[] = apiEntries.map(entry => {
    if (entry.detail) return entry;
    const bundledMatch = bundledByName.get(entry.appName);
    if (bundledMatch?.detail) {
      return { ...entry, detail: bundledMatch.detail };
    }
    return entry;
  });

  for (const bundledEntry of bundled) {
    if (!apiNames.has(bundledEntry.appName)) {
      log.debug(`Backend manifest missing "${bundledEntry.appName}" — using bundled entry`);
      merged.push(bundledEntry);
    }
  }

  return merged;
}

export const applicationsManifestService = {
  fetch: fetchManifest,
};
