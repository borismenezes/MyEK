import { Platform } from 'react-native';
import { config } from '@/config';
import type { ServiceDefinition } from './types';

/**
 * Pilot static remotes — hardcoded until the backend Registry serves the
 * app-scoped catalog (`/v1/services/catalog?app=myek`). Each entry's
 * `manifestUrl` points at the OTA service's app-scoped path
 * (`/v1/mf/{app}/{platform}/{remote}/mf-manifest.json`, unauthenticated per
 * ADR-0020). Replacing this with a live catalog fetch is the follow-up slice.
 */
export function getStaticRemotes(): ServiceDefinition[] {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const mfUrl = (remote: string) =>
    `${config.mf.otaBaseUrl}/v1/mf/${config.mf.app}/${platform}/${remote}/mf-manifest.json`;

  return [
    {
      id: 'leave',
      name: 'Leave',
      icon: 'calendar',
      version: '1.0.0',
      minShellVersion: '1.0.0',
      status: 'ACTIVE',
      surfaces: ['HOME', 'SERVICES_TAB'],
      mf: {
        remoteName: 'leave',
        manifestUrl: mfUrl('leave'),
        exposes: { widgets: './widgets', screens: './screens' },
      },
    },
  ];
}

/** widgetId → the serviceId of the remote that exposes it (pilot map). */
const REMOTE_WIDGETS: Record<string, string[]> = {
  leave: ['leave'],
};

/** The remote service that provides a given home widget, or null if in-host. */
export function getRemoteForWidget(widgetId: string): ServiceDefinition | null {
  const serviceId = Object.keys(REMOTE_WIDGETS).find(id => REMOTE_WIDGETS[id].includes(widgetId));
  if (!serviceId) return null;
  return getStaticRemotes().find(s => s.id === serviceId) ?? null;
}
