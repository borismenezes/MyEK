import { stores, json } from '@utils/storage';
import { DEFAULT_LAYOUT_ORDER, defaultWidgetLayout, getRegistryEntry, resolveWidgetSize } from './WidgetRegistry';
import type { AppManifestEntry, WidgetConfig, WidgetSize } from '@/types';

/**
 * Persistent home-grid layout, edited by the user via the Edit Widgets drawer.
 *
 * Lifecycle:
 *  - First app install (no persisted value) → caller derives a layout from
 *    the applications manifest (preferred) or falls back to
 *    `defaultWidgetLayout`, then seeds storage with the result.
 *  - Every add / remove / reorder writes the new layout here.
 *  - On every cold start, HomeScreen reads from here, so user customisations
 *    survive across launches.
 *  - "Reset Widget Layout" in the More tab calls `clear()`.
 */
const KEY = 'widgets.userLayout.v1';

/**
 * Find the smartest insertion index for a new widget being added.
 *
 *  - SMALL widgets fill the first available col=1 gap. A gap exists when
 *    a small at col=0 is followed by a large (which got bumped to the
 *    next row), or when the layout ends at col=1. Inserting before the
 *    large (or at the end) tucks the new small into that empty slot.
 *  - LARGE widgets always append — they need a full row, so any existing
 *    col=1 gap can't help them.
 *
 * The returned index is suitable for `array.splice(index, 0, item)`.
 */
export function findSmartInsertionIndex(
  layout: WidgetConfig[],
  newSize: WidgetSize,
): number {
  if (newSize !== 'small') return layout.length;

  let col = 0;
  for (let i = 0; i < layout.length; i++) {
    const span: 1 | 2 = layout[i].layout.size === 'small' ? 1 : 2;
    // The previous small left col=1 empty and this large is about to bump
    // itself to a new row → the col=1 slot before this index is the gap.
    if (span === 2 && col === 1) return i;
    col += span;
    if (col >= 2) col = 0;
  }
  // Trailing gap: layout ends with a lone small at col=0.
  return layout.length;
}

/**
 * Build a WidgetConfig[] from the applications manifest. Each enabled app
 * yields one widget — sized per the manifest, labelled per the manifest,
 * and bound to the matching WidgetRegistry entry. Disabled / unknown
 * widgets are filtered out.
 *
 * Field translation manifest → config:
 *   manifest.appName         →  config.appName
 *   manifest.applicationName →  config.applicationName  (drives header)
 *   manifest.widgetName      →  config.widgetId         (registry lookup)
 */
/**
 * Resolve the manifest entry that matches a widget instance.
 *
 * Match strategy (in order):
 *  1. `entry.appName === item.appName` — preferred when the widget instance
 *     was built via `layoutFromManifest` so it already carries `appName`.
 *  2. `entry.widgetName === item.widgetId` — fallback for widgets created
 *     from `createWidgetConfig` (e.g. the bundled `defaultWidgetLayout` on
 *     first install) which don't yet carry `appName`. Works as long as one
 *     widget template maps to one app — which is the current contract.
 *
 * Returning the entry (rather than just a boolean) lets callers also pull
 * the human-readable `applicationName` and the `detail` config in one go.
 */
export function findManifestEntryForWidget(
  item: WidgetConfig,
  manifest: AppManifestEntry[],
): AppManifestEntry | undefined {
  if (item.appName) {
    const byAppName = manifest.find(e => e.appName === item.appName);
    if (byAppName) return byAppName;
  }
  return manifest.find(e => e.widgetName === item.widgetId);
}

export function layoutFromManifest(manifest: AppManifestEntry[]): WidgetConfig[] {
  const configs = manifest
    .filter(entry => entry.enabled)
    .map<WidgetConfig | null>(entry => {
      const reg = getRegistryEntry(entry.widgetName);
      if (!reg) return null;
      // Honour a manifest-supplied API binding when present; otherwise fall
      // back to the registry's defaultConfig so the widget still renders.
      const apiVersion = entry.apiVersion ?? reg.defaultConfig.apiVersion;
      const endpoint = entry.endpoint ?? reg.defaultConfig.endpoint;
      return {
        widgetId: entry.widgetName,
        appName: entry.appName,
        applicationName: entry.applicationName,
        apiVersion,
        endpoint,
        layout: { size: resolveWidgetSize(entry.defaultSize, entry.widgetName) },
        ...(reg.defaultConfig.refreshIntervalMs !== undefined
          ? { refreshIntervalMs: reg.defaultConfig.refreshIntervalMs }
          : {}),
      };
    })
    .filter((c): c is WidgetConfig => c !== null);
  // Canonical home-grid order — derived from `DEFAULT_LAYOUT_ORDER` in the
  // WidgetRegistry. Manifest-derived configs are emitted in this order
  // regardless of how the backend/bundled JSON sequences its entries; widgets
  // unknown to the registry order (future additions) settle at the end,
  // keeping the head of the list stable across launches.
  return sortByCanonicalOrder(configs);
}

function sortByCanonicalOrder(configs: WidgetConfig[]): WidgetConfig[] {
  const rank = new Map<string, number>(DEFAULT_LAYOUT_ORDER.map((id, i) => [id, i]));
  const tail = DEFAULT_LAYOUT_ORDER.length;
  return [...configs].sort((a, b) => (rank.get(a.widgetId) ?? tail) - (rank.get(b.widgetId) ?? tail));
}

export const widgetLayoutStorage = {
  read(): WidgetConfig[] | null {
    const raw = json.get<WidgetConfig[]>(stores.prefs, KEY);
    if (!raw) return null;
    // Self-heal stale persisted sizes: clamp each tile's size to the sizes its
    // registry entry currently supports. A layout persisted before a widget's
    // supported sizes changed (e.g. My Trips becoming large-only) would
    // otherwise keep rendering at the old height until a manual layout reset.
    return raw.map(c => ({
      ...c,
      layout: { ...c.layout, size: resolveWidgetSize(c.layout?.size, c.widgetId) },
    }));
  },
  write(layout: WidgetConfig[]): void {
    json.set(stores.prefs, KEY, layout);
  },
  clear(): void {
    stores.prefs.delete(KEY);
  },
  /** Convenience for the reset action. */
  resetToDefault(): WidgetConfig[] {
    stores.prefs.delete(KEY);
    return defaultWidgetLayout;
  },
};
