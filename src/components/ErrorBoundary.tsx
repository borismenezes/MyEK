import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { createLogger } from '@utils/logger';

const log = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  /** Name used in logs to identify which surface crashed. */
  label?: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Screen-level error boundary. A render throw anywhere in the wrapped tree
 * (e.g. a transiently-malformed markdown chunk while the AI assistant streams,
 * or an unexpected payload shape) used to unmount the whole scene and leave a
 * blank tab — fatal and unrecoverable in release builds, where a JS throw shows
 * no red box, just a blank screen. This catches it, logs it, and renders a
 * small themed fallback with a "Try again" that re-mounts the subtree.
 *
 * Kept theme-free (raw colours) on purpose: the fallback must render even if the
 * crash happened while resolving theme/context, so it can't depend on a hook.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    log.warn(`"${this.props.label ?? 'screen'}" crashed during render`, error);
  }

  private reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.host}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>This screen hit an unexpected error. You can try again.</Text>
        <Pressable
          onPress={this.reset}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button">
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

/** Wrap a screen component so it's protected by an ErrorBoundary. */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  label?: string,
): React.FC<P> {
  const Wrapped: React.FC<P> = props => (
    <ErrorBoundary label={label ?? Component.displayName ?? Component.name}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${label ?? Component.displayName ?? Component.name ?? 'Component'})`;
  return Wrapped;
}

const styles = {
  host: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 32,
    gap: 8,
    backgroundColor: 'rgb(245, 245, 245)',
  },
  title: { fontSize: 17, fontWeight: '700' as const, color: 'rgb(10, 10, 10)' },
  body: { fontSize: 13, color: 'rgb(115, 115, 115)', textAlign: 'center' as const, marginBottom: 8 },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgb(198, 12, 48)',
  },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '700' as const },
};