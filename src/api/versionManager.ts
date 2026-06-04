import type { ApiVersion } from '@/types';
import { config } from '@config/index';

/**
 * Resolves the API version to use for a given logical service.
 *
 * Versions per service come from the LoginResult (server-controlled) and
 * are stored in the auth store. This module exposes a small facade so
 * services can call `version.for('leave')` without knowing about the store.
 *
 * Why server-driven? It lets us roll out v2 of an endpoint to a subset of
 * users without shipping a new app build.
 */
let map: Record<string, ApiVersion> = {};

export const versionRegistry = {
  set(next: Record<string, ApiVersion>) {
    map = { ...next };
  },
  for(service: string): ApiVersion {
    return map[service] ?? config.api.defaultVersion;
  },
  current(): Record<string, ApiVersion> {
    return { ...map };
  },
  clear() {
    map = {};
  },
};
