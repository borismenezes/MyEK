import React, { Component, Suspense, useMemo } from 'react';
import { EXPOSE_WIDGETS, loadExpose } from './dynamicRemotes';
import type { ServiceDefinition } from './types';

type AnyWidget = React.ComponentType<any>;

/**
 * Renders a home widget from a federated remote, falling back to the in-host
 * component while it loads or if the remote fails (offline / not-yet-deployed /
 * load error). `loadExpose` self-registers the remote on first use.
 *
 * The `service` comes from the app catalog (useCatalogStore), so which widgets
 * are federated is backend-driven — no hardcoded list in the client.
 *
 * Lenient fallback (the plan's loose fallback): the user always sees the tile —
 * the in-host version until the remote is available, then the remote.
 */
interface FederatedWidgetProps {
  service: ServiceDefinition;
  widgetId: string;
  Fallback: AnyWidget;
  widgetProps: Record<string, unknown>;
}

export function FederatedWidget({ service, widgetId, Fallback, widgetProps }: FederatedWidgetProps): React.ReactElement {
  const Lazy = useMemo(
    () =>
      React.lazy(async () => {
        const mod = await loadExpose<any>(service, EXPOSE_WIDGETS);
        // The remote exposes `export default Record<widgetId, Component>`.
        const map = (mod && (mod.default ?? mod)) as Record<string, AnyWidget>;
        const Comp = map?.[widgetId];
        if (!Comp) throw new Error(`[MF] remote "${service.id}" exposes no widget "${widgetId}"`);
        return { default: Comp };
      }),
    [service.id, service.mf?.bundleHash, widgetId],
  );

  return (
    <FederatedWidgetBoundary fallback={<Fallback {...widgetProps} />}>
      <Suspense fallback={<Fallback {...widgetProps} />}>
        <Lazy {...widgetProps} />
      </Suspense>
    </FederatedWidgetBoundary>
  );
}

interface BoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}
class FederatedWidgetBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(error: unknown): void {
    console.warn('[MF] federated widget failed; using in-host fallback:', error);
  }
  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
