import { apiGet } from '@myek/api-client';
import type { LeaveBalancePayload } from './types';

/**
 * The leave remote's own BFF calls — the self-fetching widget contract. The
 * remote, not the host, owns which endpoints it talks to; the host only
 * supplies auth + base URL via the @myek/api-client globalThis slots
 * (wired in the host's wireApiAuth).
 *
 * Reference implementation of the canonical pattern (every new service's
 * api.ts should look like this — see docs/adding-a-service.md).
 */

/** Stable cache key prefix — one query-cache domain per service. */
export const LEAVE_QUERY_KEYS = {
  widget: ['myek', 'leave', 'widget'] as const,
};

export function fetchLeaveWidget(): Promise<LeaveBalancePayload> {
  return apiGet<LeaveBalancePayload>('/v1/myek/leave/widget');
}
