/**
 * Widget contract comes from @myek/sdk — the cross-bundle type contract shared
 * with the host (compile-time only; types are erased). Payload types below are
 * this remote's own.
 */
export type { WidgetConfig, WidgetProps, WidgetComponent } from '@myek/sdk';

export type PayslipStatus = 'available' | 'pending' | 'unavailable';
export interface PayslipPayload { monthLabel: string; creditedAt: string; status?: PayslipStatus; }

export interface PayslipLineItem {
  label: string;
  amount: number;
}

/**
 * Full payslip document — payload of GET /v1/myek/payslip/details. Mirrors
 * the BFF wire shape (the host's former src/types copy moved here with the
 * document; the payslip remote owns this contract now).
 */
export interface PayslipDocumentPayload {
  /** Top centered banner, e.g. "PAY ADVICE FOR OCTOBER 2025". */
  periodLabel: string;
  employeeNumber: string;
  employeeName: string;
  position: string;
  organization: string;
  /** Date of joining — kept as a pre-formatted display string. */
  doj: string;
  grade: string;
  currency: string;
  payments: PayslipLineItem[];
  deductions: PayslipLineItem[];
  bankBranchName: string;
  accountNumber: string;
  /** Pre-computed net pay amount (payments total - deductions total). */
  netPayAmount: number;
  /** Footer message — usually leave balance or HR note. */
  message: string;
}
