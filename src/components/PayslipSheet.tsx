import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { payslipDetailsService } from '@services/payslipDetailsService';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';
import payslipDefault from '@services/defaults/payslipDetails.json';
import type { PayslipDocumentPayload, PayslipLineItem } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PayslipSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet drawer that renders a printable payslip for the signed-in
 * employee.
 *
 * Data comes from `payslipDetails.json` (the bundled default until a real
 * payslip-document service is wired). Employee name + number are overridden
 * at render time from the auth store so the document reflects the real user.
 *
 * Share button captures the payslip view as a high-resolution PNG via
 * `react-native-view-shot` and hands it to the OS share sheet — users can
 * then save to Files / mail / message. For true PDF export, install
 * `react-native-html-to-pdf` and replace the capture path in `handleShare`.
 */
export const PayslipSheet: React.FC<PayslipSheetProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const [fetched, setFetched] = useState<PayslipDocumentPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const docRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, { damping: 22, stiffness: 180, mass: 0.9 });
    } else {
      progress.value = withTiming(0, { duration: 240 }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  // Fetch live payslip data every time the drawer is opened. The reset on
  // close ensures the next open re-fetches even if the underlying employee
  // id hasn't changed — payslips are high-stakes, never serve stale data.
  useEffect(() => {
    if (!visible) {
      setFetched(null);
      setLoading(false);
      return;
    }
    const employeeId = user?.employeeId;
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    payslipDetailsService
      .fetch(employeeId)
      .then(data => {
        if (!cancelled) setFetched(data);
      })
      .catch(() => {
        // Fall back to bundled default below.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, user?.employeeId]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [SCREEN_HEIGHT, 0], Extrapolation.CLAMP) },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(docRef, { format: 'png', quality: 0.98, result: 'tmpfile' });
      await Share.share({ url: uri, title: 'Payslip', message: 'Payslip' });
    } catch {
      // Cancelled or capture failed — silent. The share sheet itself gives
      // feedback on success / errors.
    }
  }, []);

  if (!mounted && !visible) return null;

  const data = fetched ?? (payslipDefault as PayslipDocumentPayload);
  const employeeNumber = user?.employeeId ?? data.employeeNumber;
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : data.employeeName;
  const employeeName = fullName.length > 0 ? fullName.toUpperCase() : data.employeeName;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View
        style={[StyleSheet.absoluteFill, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close payslip" />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: insets.top + 24,
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: insets.bottom + 12,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: -4 },
            shadowRadius: 16,
            elevation: 12,
          },
          sheetStyle,
        ]}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.line }} />
        </View>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.4 }}>
              Payslip
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              {data.periodLabel}
            </Text>
          </View>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share payslip"
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="share" size={16} color={theme.colors.ink} />
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close payslip"
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="close" size={16} color={theme.colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}>
          <View
            ref={docRef}
            collapsable={false}
            style={styles.paper}>
            <PayslipDocument
              data={data}
              employeeNumber={employeeNumber}
              employeeName={employeeName}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// ─── Document body ─────────────────────────────────────────────────────

const PayslipDocument: React.FC<{
  data: PayslipDocumentPayload;
  employeeNumber: string;
  employeeName: string;
}> = ({ data, employeeNumber, employeeName }) => {
  const paymentsTotal = sumLineItems(data.payments);
  const deductionsTotal = sumLineItems(data.deductions);
  return (
    <View style={{ gap: 12 }}>
      <BrandHeader />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={styles.confidential}>CONFIDENTIAL</Text>
        <Text style={styles.period}>{data.periodLabel}</Text>
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
        currency={data.currency}
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
};

const BrandHeader: React.FC = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
    <Logo width={85} />
    <Text style={{ color: '#0a78c2', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
      dnata
    </Text>
  </View>
);

const KeyVal: React.FC<{ label: string; value: string; divider?: boolean; compact?: boolean }> = ({
  label,
  value,
  divider,
  compact,
}) => {
  // Compact rows (Position / Organization / DOJ / Grade) now match the
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

const BankRow: React.FC<{ branchName: string; accountNumber: string; netPay: number; currency: string }> = ({
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  paper: {
    backgroundColor: DOCS.paper,
    borderRadius: 6,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DOCS.line,
  },
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
