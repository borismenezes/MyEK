import { QueryClient } from '@tanstack/react-query';

/**
 * The single QueryClient for the host AND every federated remote.
 *
 * @tanstack/react-query is an MF shared singleton (shared-versions.mjs), so a
 * remote's `useQuery()` resolves the host's QueryClientProvider context and
 * lands in THIS cache — one dedupe/invalidation domain across bundles. That
 * singleton identity is the entire point; don't create per-feature clients.
 *
 * Defaults are tuned for widget tiles: data stays fresh for a minute (a grid
 * of tiles mounting together shouldn't fan out duplicate calls), one retry
 * (the tile's own error/fallback path handles the rest — no long retry storms
 * masking a real outage).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
