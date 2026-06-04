import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { PayslipDocumentPayload } from '@/types';

const log = createLogger('Service/PayslipDetails');

/**
 * Fetches the full payslip document for a given employee.
 *
 * Called by the PayslipSheet drawer every time it's opened — payslip data
 * is small and infrequently changing, but it's also high-stakes financial
 * information that should never be served stale, so the cost of a per-open
 * fetch is worth the freshness guarantee.
 */
async function fetchPayslip(employeeId: string): Promise<PayslipDocumentPayload> {
  if (!employeeId) throw new Error('payslipDetailsService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.myPayslip, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<PayslipDocumentPayload>(path);
  return { ...res.data, doj: toDojDisplay(res.data.doj) };
}

/**
 * Normalise the API's `doj` to "dd-MMM-yyyy" (e.g. "03-Sep-2025").
 *
 * The backend has historically sent either an ISO timestamp
 * ("2025-09-03T00:00:00.000Z") or a date-only string ("2025-09-03") — both
 * parse cleanly and render unrecognisably as raw timestamps inside the
 * payslip. Already-formatted values ("03-Sep-2025") pass through unchanged;
 * anything we can't parse is returned as-is so the document doesn't break
 * on unexpected shapes.
 */
function toDojDisplay(value: string): string {
  if (!value) return value;
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const payslipDetailsService = {
  fetch: fetchPayslip,
};
