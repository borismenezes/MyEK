import { apiGet } from '@myek/api-client';
import type { PayslipDocumentPayload } from './types';

/**
 * The payslip remote's own BFF calls — the self-fetching contract: this
 * remote, not the host, owns which endpoints it talks to. Auth + base URL
 * come from the @myek/api-client globalThis slots the host wires at sign-in.
 */
export const PAYSLIP_QUERY_KEYS = {
  /** The full printable document (PayslipDocumentScreen). */
  details: ['myek', 'payslip', 'details'] as const,
};

export async function fetchPayslipDocument(): Promise<PayslipDocumentPayload> {
  const data = await apiGet<PayslipDocumentPayload>('/v1/myek/payslip/details');
  return { ...data, doj: toDojDisplay(data.doj) };
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
