import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import type { PayslipPayload } from '@/types';

const log = createLogger('Service/Payslip');

/**
 * Normalise the API's `monthLabel` to "Month YYYY" (e.g. "April 2026").
 * The backend has historically sent either an ISO date ("2026-04-28T...")
 * or a date-only string ("2026-04-01") — both parse cleanly. If the value
 * is already in the target format or can't be parsed, return it unchanged.
 */
function toMonthYear(value: string): string {
  if (!value) return value;
  if (/^[A-Za-z]+\s+\d{4}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

async function fetchPayslip(employeeId: string): Promise<PayslipPayload> {
  if (!employeeId) throw new Error('payslipService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.payslip, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<PayslipPayload>(path);
  return { ...res.data, monthLabel: toMonthYear(res.data.monthLabel) };
}

export const payslipService = {
  fetch: fetchPayslip,
};
