import React, { Component, Suspense, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { EXPOSE_SCREENS, loadExpose, type ReservedExposeKey } from './dynamicRemotes';
import type { ServiceDefinition } from './types';

/**
 * Mounts a federated remote's exposed component (default `./screens`) with a
 * Suspense fallback + an error boundary, so one broken/offline remote degrades
 * to an inline error + retry instead of crashing the shell. Mirrors
 * enterprise-app's FederatedTabHost. Full-screen counterpart of FederatedWidget
 * (which is the live home-grid path); mount this when a remote's `./screens`
 * expose gets a navigation entry.
 */
interface Props {
  service: ServiceDefinition;
  /** Expose to load. Defaults to the remote's screen navigator. */
  expose?: ReservedExposeKey;
  /** Props forwarded to the loaded component. */
  componentProps?: Record<string, unknown>;
}

export function FederatedRemote({ service, expose = EXPOSE_SCREENS, componentProps }: Props): React.ReactElement {
  // `attempt` is the retry key: bumping it rebuilds the lazy component, which
  // re-runs loadExpose. `bundleHash` invalidates on a remote update too.
  const [attempt, setAttempt] = useState(0);

  const Lazy = useMemo(
    () =>
      React.lazy(async () => {
        const mod = await loadExpose<{ default: React.ComponentType<Record<string, unknown>> }>(
          service,
          expose,
        );
        return { default: mod.default };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service.id, service.mf?.bundleHash, expose, attempt],
  );

  return (
    <FederatedErrorBoundary
      key={attempt}
      serviceName={service.name}
      onRetry={() => setAttempt(n => n + 1)}>
      <Suspense fallback={<CenteredSpinner />}>
        <Lazy {...componentProps} />
      </Suspense>
    </FederatedErrorBoundary>
  );
}

function CenteredSpinner(): React.ReactElement {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator />
    </View>
  );
}

interface BoundaryProps {
  serviceName: string;
  onRetry: () => void;
  children: React.ReactNode;
}
interface BoundaryState {
  error: Error | null;
}

class FederatedErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.warn(`[MF] remote "${this.props.serviceName}" failed to load:`, error.message);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
            {this.props.serviceName} couldn’t load
          </Text>
          <Text style={{ fontSize: 13, color: '#6b6b70', textAlign: 'center' }}>
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => {
              this.setState({ error: null });
              this.props.onRetry();
            }}
            style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 14, fontWeight: '600' }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
