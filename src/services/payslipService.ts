import { apimClient, buildPath } from '@api/apimClient';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import { previousMonthLabel } from '@utils/dates';
import type { PayslipPayload } from '@/types';

const log = createLogger('Service/Payslip');

async function fetchPayslip(employeeId: string): Promise<PayslipPayload> {
  if (!employeeId) throw new Error('payslipService.fetch: employeeId is required');
  const path = buildPath(config.apim.paths.payslip, { employeeId });
  log.debug(`GET ${path}`);
  const res = await apimClient().get<PayslipPayload>(path);
  // The payslip is always for the PREVIOUS calendar month — label it client-side
  // so the widget + drawer stay in sync and stay current regardless of the
  // (fixed, demo) month the backend returns.
  return { ...res.data, monthLabel: previousMonthLabel() };
}

export const payslipService = {
  fetch: fetchPayslip,
};
