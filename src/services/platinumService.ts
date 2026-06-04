import { apimClient } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import platinumCardDefault from './defaults/platinumCard.json';
import type { PlatinumCardPayload } from '@/types';

const log = createLogger('Service/Platinum');

/**
 * Fetches the user's platinum-tier business card.
 *
 * Used by the Business Card widget when the user flips the card. The endpoint
 * is flat — the user is identified by the Bearer token, not a path segment —
 * so no `{employeeId}` substitution is needed. Falls back to the bundled
 * default on any failure so the flipped card never renders empty.
 */
async function fetchPlatinum(): Promise<PlatinumCardPayload> {
  const path = config.apim.paths.platinumCard;
  log.debug(`GET ${path}`);
  try {
    const res = await apimClient().get<PlatinumCardPayload>(path);
    return res.data;
  } catch (e) {
    log.warn('Platinum card fetch failed — using bundled default', e);
    return platinumCardDefault as PlatinumCardPayload;
  }
}

export const platinumService = {
  fetch: fetchPlatinum,
};
