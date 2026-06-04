import React from 'react';
import { Text, View } from 'react-native';
import { useWidgetData } from '@hooks/useWidgetData';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme, widgetTheme } from '@theme/index';
import { getRegistryEntry } from './WidgetRegistry';
import { WidgetShell } from './WidgetShell';
import type { WidgetConfig } from '@/types';

interface WidgetRendererProps {
  config: WidgetConfig;
  /**
   * Read-only render. Skips the data fetch (no service call, no loading
   * skeleton) and hydrates from the existing widget cache, falling back to
   * the bundled default. Used by the edit drawer so opening it doesn't
   * re-fire every widget's service — the home-screen instances already own
   * the live state.
   */
  preview?: boolean;
}

/**
 * Single component the HomeScreen uses to render any widget.
 *
 * Responsibilities:
 *  - Look up the component from the registry (returns a friendly placeholder
 *    if the server sent a widgetId we don't know — happens when the app is
 *    behind on releases).
 *  - Permission-gate using the auth store.
 *  - Drive data via useWidgetData (cache + offline + retry handled there).
 *  - Wrap in WidgetShell for skeleton/error/stale chrome.
 *
 * Wrapped in React.memo with a config-shape comparator so that toggling
 * unrelated UI state on the parent (e.g. opening the edit drawer, a sibling
 * widget being removed) doesn't trigger a re-render. The widget keeps its
 * fetched data and avoids the brief "loading" flash on every parent update.
 */
const WidgetRendererImpl: React.FC<WidgetRendererProps> = ({ config, preview = false }) => {
  const entry = getRegistryEntry(config.widgetId);
  const hasPermission = useAuthStore(s =>
    !config.requiredPermissions || config.requiredPermissions.every(p => s.permissions.includes(p as any)),
  );

  // Hook is always called (rules of hooks); `skip` puts it into a passive
  // preview mode for the edit drawer — no fetcher, no interval, no refresh
  // listener. Initial state is hydrated synchronously from the cache.
  const { data, loading, error, isStale, refresh } = useWidgetData<unknown>(config, { skip: preview });

  if (!entry) return <UnknownWidget widgetId={config.widgetId} />;
  if (!hasPermission) return null;

  const Component = entry.component;

  return (
    <WidgetShell
      size={config.layout.size}
      loading={loading && !data}
      error={!data ? error : null}
      isStale={entry.hideStaleIndicator ? false : isStale}
      onRetry={refresh}
      bare={!entry.surface}>
      <Component
        config={config}
        data={data}
        loading={loading}
        error={error}
        isStale={isStale}
        onRefresh={refresh}
        preview={preview}
      />
    </WidgetShell>
  );
};

/**
 * Memoize on the actual config fields the renderer reads — not the object
 * identity — so a parent re-creating the array (filter/splice on remove)
 * with the same logical entries doesn't churn each child.
 */
export const WidgetRenderer = React.memo(WidgetRendererImpl, (prev, next) => {
  const a = prev.config;
  const b = next.config;
  return (
    prev.preview === next.preview &&
    a.widgetId === b.widgetId &&
    a.apiVersion === b.apiVersion &&
    a.endpoint === b.endpoint &&
    a.layout.size === b.layout.size &&
    a.refreshIntervalMs === b.refreshIntervalMs &&
    JSON.stringify(a.params) === JSON.stringify(b.params)
  );
});

const UnknownWidget: React.FC<{ widgetId: string }> = ({ widgetId }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: 14,
        minHeight: 155,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, textAlign: 'center' }}>
        Unknown widget{'\n'}
        <Text style={{ fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.inkSecondary }}>{widgetId}</Text>
        {'\n'}Update the app to see it.
      </Text>
    </View>
  );
};
