import React, { Component, Suspense, useMemo } from 'react';
import { config } from '@/config';
import { EXPOSE_WIDGETS, loadExpose } from './dynamicRemotes';
import { getRemoteForWidget } from './staticRemotes';
import type { ServiceDefinition } from './types';

type AnyWidget = React.ComponentType<any>;

/**
 * Renders a home widget from a federated remote, falling back to the in-host
 * component while it loads or if the remote fails (offline / not-yet-deployed /
 * load error). `loadExpose` self-registers the remote on first use, so no boot
 * wiring is required.
 *
 * The fallback is deliberately lenient (the plan's loose fallback): the user
 * always sees the tile — the in-host version until the remote is available,
 * then the remote. This is also what makes flipping config.mf.enabled safe
 * before the OTA bundle is live.
 */
interface FederatedWidgetProps {
  service: ServiceDefinition;
  widgetId: string;
  Fallback: AnyWidget;
  widgetProps: Record<string, unknown>;
}

function FederatedWidget({ service, widgetId, Fallback, widgetProps }: FederatedWidgetProps): React.ReactElement {
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

/**
 * Returns a widget component backed by a federated remote (with in-host
 * fallback), or null when this widgetId has no remote / federation is disabled —
 * in which case the caller renders the in-host component as usual.
 *
 * Memoised per widgetId so the WidgetRenderer gets a stable component identity.
 */
const cache = new Map<string, AnyWidget>();

export function getFederatedWidgetComponent(widgetId: string, Fallback: AnyWidget): AnyWidget | null {
  if (!config.mf.enabled) return null;
  const service = getRemoteForWidget(widgetId);
  if (!service) return null;

  const cached = cache.get(widgetId);
  if (cached) return cached;

  const Wrapped: AnyWidget = (props: Record<string, unknown>) => (
    <FederatedWidget service={service} widgetId={widgetId} Fallback={Fallback} widgetProps={props} />
  );
  Wrapped.displayName = `Federated(${widgetId})`;
  cache.set(widgetId, Wrapped);
  return Wrapped;
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
