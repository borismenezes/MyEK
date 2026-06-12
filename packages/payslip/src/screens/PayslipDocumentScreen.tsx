import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SvgXml } from 'react-native-svg';
import { usePlatformUser } from '@myek/ui';
import { fetchPayslipDocument, PAYSLIP_QUERY_KEYS } from '../api';
import { EMIRATES_LOGO_SVG } from '../assets/emiratesLogoSource';
import { DNATA_LOGO_SVG } from '../assets/dnataLogoSource';
import payslipDefault from '../defaults/payslipDetails.json';
import type { PayslipDocumentPayload, PayslipLineItem } from '../types';

/**
 * Printable payslip document — the `payslip` remote's `./screens` expose,
 * and the reference implementation of a self-fetching federated SCREEN
 * (what leave's widget is for tiles). The host's PayslipSheet supplies only
 * chrome (bottom sheet, share-capture); everything inside the paper —
 * letterhead, layout, data — is owned by this remote and ships OTA.
 *
 * Data: fetched fresh on every mount (payslips are high-stakes; never serve
 * stale), via @myek/api-client + the host's shared QueryClient. Until the
 * BFF details adapter lands the endpoint 404s and the bundled default
 * renders — the same interim behaviour the host had, made explicit below.
 * Employee name/number come from the platform bridge so the document shows
 * the signed-in user, not the placeholder persona.
 */
export default function PayslipDocumentScreen(): React.ReactElement {
  const user = usePlatformUser();
  const query = useQuery({
    queryKey: PAYSLIP_QUERY_KEYS.details,
    queryFn: fetchPayslipDocument,
    // High-stakes financial data: refetch on every open, keep nothing around.
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 0,
  });

  // BFF-incomplete interim (mirrors the host's previous behaviour): the
  // details endpoint isn't live yet, so a failed fetch falls back to the
  // bundled default document rather than an error tile. Once the adapter
  // ships, flip this to a real error state like the widgets.
  const data = query.data ?? (payslipDefault as PayslipDocumentPayload);

  const employeeNumber = user?.staffId || data.employeeNumber;
  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : data.employeeName;
  const employeeName = fullName.length > 0 ? fullName.toUpperCase() : data.employeeName;

  const paymentsTotal = sumLineItems(data.payments);
  const deductionsTotal = sumLineItems(data.deductions);

  return (
    <View style={{ gap: 12 }}>
      <BrandHeader />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={styles.confidential}>CONFIDENTIAL</Text>
        <Text style={styles.period}>{previousMonthPeriodLabel()}</Text>
      </View>

      <View style={styles.employeeBox}>
        <KeyVal label="Employee" value={`${employeeNumber} - ${employeeName}`} divider />
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1.2 }}>
            <KeyVal label="Position" value={data.position} compact />
            <KeyVal label="Organization" value={data.organization} compact />
          </View>
          <View style={{ flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: DOCS.line, paddingLeft: 12 }}>
            <KeyVal label="DOJ" value={data.doj} compact />
            <KeyVal label="Grade" value={data.grade} compact />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <LineItemTable title="Payments" rows={data.payments} total={paymentsTotal} />
        </View>
        <View style={{ flex: 1 }}>
          <LineItemTable title="Deductions" rows={data.deductions} total={deductionsTotal} />
        </View>
      </View>

      <BankRow
        branchName={data.bankBranchName}
        accountNumber={data.accountNumber}
        netPay={data.netPayAmount}
      />

      <View style={styles.messageBox}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageHeaderText}>Message</Text>
        </View>
        <View style={{ padding: 10 }}>
          <Text style={{ fontSize: 11, color: DOCS.ink, lineHeight: 16 }}>{data.message}</Text>
        </View>
      </View>
    </View>
  );
}

// Letterhead marks: official brand SVGs (hardcoded brand colours — these are
// deliberately NOT theme-tinted; the document is a fixed white printable).
// Heights derive from each source's viewBox so the marks scale undistorted.
const EMIRATES_LOGO_WIDTH = 56; // viewBox 128×150 → ≈66 tall
const EMIRATES_LOGO_HEIGHT = Math.round(EMIRATES_LOGO_WIDTH * (150 / 128));
const DNATA_LOGO_WIDTH = 72; // viewBox 135×102 → ≈54 tall
const DNATA_LOGO_HEIGHT = Math.round(DNATA_LOGO_WIDTH * (102 / 135));

const BrandHeader: React.FC = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
    <SvgXml xml={EMIRATES_LOGO_SVG} width={EMIRATES_LOGO_WIDTH} height={EMIRATES_LOGO_HEIGHT} />
    <SvgXml xml={DNATA_LOGO_SVG} width={DNATA_LOGO_WIDTH} height={DNATA_LOGO_HEIGHT} />
  </View>
);

const KeyVal: React.FC<{ label: string; value: string; divider?: boolean; compact?: boolean }> = ({
  label,
  value,
  divider,
  compact,
}) => {
  // Compact rows (Position / Organization / DOJ / Grade) match the
  // payments/deductions row font size (11) so the document reads with a
  // consistent body weight. Values wrap onto the next line when too long
  // for one — no truncation, no font-shrinking.
  const fontSize = compact ? 11 : 12;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: compact ? 5 : 8,
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: DOCS.line,
      }}>
      <Text style={[styles.kvLabel, { width: 84, fontSize }]}>{label}</Text>
      <Text style={[styles.kvColon, { fontSize }]}>:</Text>
      <Text style={[styles.kvValue, { flex: 1, fontSize, lineHeight: fontSize + 4 }]}>
        {value}
      </Text>
    </View>
  );
};

const LineItemTable: React.FC<{ title: string; rows: PayslipLineItem[]; total: number }> = ({
  title,
  rows,
  total,
}) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      <Text style={styles.tableHeaderTitle}>{title}</Text>
      <Text style={styles.tableHeaderTitle}>Amount</Text>
    </View>
    <View style={{ padding: 10, gap: 6, minHeight: 120 }}>
      {rows.map((r, i) => (
        <View key={`${title}-${i}`} style={styles.tableRow}>
          <Text style={styles.tableRowLabel} numberOfLines={1}>
            {r.label}
          </Text>
          <Text style={styles.tableRowAmount}>{formatAmount(r.amount)}</Text>
        </View>
      ))}
    </View>
    <View style={styles.tableTotal}>
      <Text style={styles.tableTotalLabel}>Total</Text>
      <Text style={styles.tableTotalAmount}>{formatAmount(total)}</Text>
    </View>
  </View>
);

const BankRow: React.FC<{ branchName: string; accountNumber: string; netPay: number }> = ({
  branchName,
  accountNumber,
  netPay,
}) => (
  <View style={styles.bankBox}>
    <View style={styles.bankHeader}>
      <Text style={[styles.bankHeaderText, { flex: 1.4 }]}>Bank - Branch Name</Text>
      <Text style={[styles.bankHeaderText, { flex: 1.6 }]}>Account Number</Text>
      <Text style={[styles.bankHeaderText, { flex: 1, textAlign: 'right' }]}>Net Pay Amount</Text>
    </View>
    <View style={styles.bankRow}>
      <Text style={[styles.bankRowText, { flex: 1.4 }]} numberOfLines={1}>
        {branchName}
      </Text>
      <Text style={[styles.bankRowText, { flex: 1.6 }]} numberOfLines={1}>
        {accountNumber}
      </Text>
      <Text style={[styles.bankRowText, { flex: 1, textAlign: 'right', fontWeight: '700' }]} numberOfLines={1}>
        {formatAmount(netPay)}
      </Text>
    </View>
  </View>
);

// ─── helpers ─────────────────────────────────────────────────────────

function sumLineItems(items: PayslipLineItem[]): number {
  return items.reduce((sum, i) => sum + i.amount, 0);
}

/**
 * "PAY ADVICE FOR MAY 2026" — the payslip is always for the PREVIOUS calendar
 * month, so label off the date rather than the (fixed, demo) `data.periodLabel`.
 * Mirrors the host's payslipService (which does the same for the home widget);
 * the host util can't be imported across the bundle boundary, hence the local copy.
 */
function previousMonthPeriodLabel(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `PAY ADVICE FOR ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── styles ─────────────────────────────────────────────────────────
// Document styles deliberately use fixed colours (not theme tokens) so the
// payslip prints identically in light and dark mode — a paystub renders the
// same on paper regardless of OS appearance.
const DOCS = {
  paper: '#FFFFFF',
  ink: '#1a1a1a',
  muted: '#5b5b5b',
  line: '#cfcfcf',
  softGrey: '#e9e9eb',
  brandRed: '#9b0c2e',
};

const styles = StyleSheet.create({
  confidential: {
    color: DOCS.brandRed,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  period: {
    color: DOCS.brandRed,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  employeeBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DOCS.line,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  kvLabel: {
    fontSize: 12,
    color: DOCS.ink,
    fontWeight: '700',
  },
  kvColon: {
    fontSize: 12,
    color: DOCS.ink,
    paddingHorizontal: 6,
    fontWeight: '700',
  },
  kvValue: {
    fontSize: 12,
    color: DOCS.ink,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DOCS.line,
    backgroundColor: DOCS.paper,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: DOCS.softGrey,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DOCS.line,
  },
  tableHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: DOCS.ink,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  tableRowLabel: {
    flex: 1,
    fontSize: 11,
    color: DOCS.ink,
  },
  tableRowAmount: {
    fontSize: 11,
    color: DOCS.ink,
    fontVariant: ['tabular-nums'],
  },
  tableTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: DOCS.softGrey,
    borderTopWidth: 1,
    borderTopColor: DOCS.ink,
  },
  tableTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DOCS.ink,
  },
  tableTotalAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: DOCS.ink,
    fontVariant: ['tabular-nums'],
  },
  bankBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DOCS.line,
    backgroundColor: DOCS.paper,
  },
  bankHeader: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DOCS.line,
    gap: 8,
  },
  bankHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: DOCS.ink,
  },
  bankRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  bankRowText: {
    fontSize: 11,
    color: DOCS.ink,
  },
  messageBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DOCS.line,
    backgroundColor: DOCS.paper,
  },
  messageHeader: {
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DOCS.line,
  },
  messageHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: DOCS.ink,
  },
});
