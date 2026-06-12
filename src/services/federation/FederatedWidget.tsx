import React, { Component, Suspense, useMemo } from 'react';
import { View } from 'react-native';
import { createLogger } from '@utils/logger';
import type { WidgetProps } from '@myek/sdk';
import { EXPOSE_WIDGETS, loadExpose } from './dynamicRemotes';
import type { ServiceDefinition } from './types';

const log = createLogger('MF');

// The host can't know each remote's payload type at this generic boundary —
// `any` is deliberate. The typed contract (`WidgetProps<T>` from @myek/sdk)
// is enforced where it matters: inside each remote and in-host widget.
type AnyWidget = React.ComponentType<any>;

/**
 * Renders a home widget from a federated remote. `loadExpose` self-registers
 * the remote on first use; the `service` comes from the app catalog
 * (useCatalogStore), so which widgets are federated is backend-driven — no
 * hardcoded list in the client.
 *
 * Fallback policy (the plan's loose fallback):
 *  - `Fallback` provided (a widget the host also bundles, the migration case):
 *    the user always sees the tile — in-host until the remote is available,
 *    then the remote.
 *  - No `Fallback` (a catalog-born widget with no in-host twin — the "new
 *    service without a host release" case): a neutral skeleton while loading,
 *    and nothing on failure (the tile vanishes rather than showing a dead box).
 */
interface FederatedWidgetProps {
  service: ServiceDefinition;
  widgetId: string;
  /** In-host twin used while loading / on failure. Optional — see fallback policy. */
  Fallback?: AnyWidget;
  widgetProps: WidgetProps<unknown>;
}

export function FederatedWidget({ service, widgetId, Fallback, widgetProps }: FederatedWidgetProps): React.ReactElement {
  const Lazy = useMemo(
    () =>
      React.lazy(async () => {
        const mod = await loadExpose<unknown>(service, EXPOSE_WIDGETS);
        // The remote exposes `export default Record<widgetId, Component>`.
        const exposed = mod as { default?: Record<string, AnyWidget> } & Record<string, AnyWidget>;
        const map = exposed.default ?? exposed;
        const Comp = map?.[widgetId];
        if (!Comp) throw new Error(`[MF] remote "${service.id}" exposes no widget "${widgetId}"`);
        return { default: Comp };
      }),
    // `service` identity churns with catalog refreshes; key on the fields that
    // actually invalidate the loaded module (same pattern as FederatedRemote).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service.id, service.mf?.bundleHash, widgetId],
  );

  const loadingFallback = Fallback ? <Fallback {...widgetProps} /> : <WidgetSkeleton />;
  const errorFallback = Fallback ? <Fallback {...widgetProps} /> : null;

  return (
    <FederatedWidgetBoundary widgetId={widgetId} fallback={errorFallback}>
      <Suspense fallback={loadingFallback}>
        <Lazy {...widgetProps} />
      </Suspense>
    </FederatedWidgetBoundary>
  );
}

/** Neutral placeholder for catalog-born widgets with no in-host twin. */
function WidgetSkeleton(): React.ReactElement {
  return <View style={{ flex: 1, minHeight: 100, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.04)' }} />;
}

interface BoundaryProps {
  widgetId: string;
  fallback: React.ReactNode;
  children: React.ReactNode;
}
class FederatedWidgetBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(error: unknown): void {
    log.warn('mf.widget.failed', {
      widgetId: this.props.widgetId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
