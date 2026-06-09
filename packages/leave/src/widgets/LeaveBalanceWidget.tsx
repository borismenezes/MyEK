import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { LeaveBalancePayload, WidgetProps } from '../types';

const EK_RED = '#d71921';
const INK = '#1a1a1c';
const MUTED = '#6b6b70';
const LINE = 'rgba(0,0,0,0.08)';

/**
 * Leave balance tile — the `leave` remote's federated home widget. Receives its
 * data via props from the host's WidgetRenderer (MyEK's data-via-props widget
 * contract), so the remote stays a pure presentational component.
 *
 * Self-contained styling for the pilot; will adopt @myek/ui (the shared design
 * system) in a later slice so it matches the host's BalanceMeter exactly.
 */
export const LeaveBalanceWidget: React.FC<WidgetProps<LeaveBalancePayload>> = ({ data, loading }) => {
  if (loading && !data) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator color={EK_RED} />
      </View>
    );
  }

  const total = data?.total ?? 0;
  const used = data?.used ?? 0;
  const pending = data?.pending ?? 0;
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min(1, used / total) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>ANNUAL LEAVE</Text>
      <View style={styles.row}>
        <Text style={styles.big}>{remaining}</Text>
        <Text style={styles.unit}>days remaining</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.foot}>{used} used</Text>
        {pending > 0 ? <Text style={styles.foot}>{pending} pending</Text> : null}
        <Text style={styles.foot}>{total} total</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, justifyContent: 'center', gap: 8 },
  center: { alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: MUTED },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  big: { fontSize: 34, fontWeight: '800', color: INK, letterSpacing: -1 },
  unit: { fontSize: 13, fontWeight: '600', color: MUTED },
  track: { height: 6, borderRadius: 3, backgroundColor: LINE, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: EK_RED },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  foot: { fontSize: 11, fontWeight: '600', color: MUTED },
});
