import { apimClient } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { PlatinumVouchersPayload } from '@/types';

const log = createLogger('Service/PlatinumVouchers');

/**
 * Fetches the user's purchased Platinum-card vouchers (Lulu, Carrefour,
 * Careem, Noon, Global Village, …). The endpoint is flat — the user is
 * identified by the Bearer token attached by the apimClient, not by a path
 * segment — so no employeeId substitution is needed.
 */
async function fetchPlatinumVouchers(): Promise<PlatinumVouchersPayload> {
  const path = config.apim.paths.platinumVouchers;
  log.debug(`GET ${path}`);
  const res = await apimClient().get<PlatinumVouchersPayload>(path);
  return res.data;
}

export const platinumVouchersService = {
  fetch: fetchPlatinumVouchers,
};
