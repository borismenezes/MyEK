import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card } from '@components/index';
import { applicationDetailService } from '@services/applicationDetailService';
import { useTheme, widgetTheme } from '@theme/index';
import type { LeaveDetailsPayload, LeaveItem, LeaveStatus } from '@/types';
import type { DetailLayoutProps } from './DetailLayoutRegistry';

/**
 * Detail layout for `manifest.detail.layout === 'list'`.
 *
 * Currently bound to the Leave application: a balance summary with a
 * usage donut at the top, and a chronologically-ordered list of leave
 * records below. Items whose end-date has already passed are de-emphasised
 * and tagged with a small "PAST" pill so the user can scan upcoming
 * vs. historical leave at a glance.
 */
export const LeaveDetailLayout: React.FC<DetailLayoutProps> = ({ entry }) => {
  const theme = useTheme();
  const [data, setData] = useState<LeaveDetailsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generic fetch — keyed by `entry.appName`. The same layout serves any
  // app whose manifest declares `detail.layout: 'list'` and registers a
  // bundled-default JSON in `applicationDetailService` under its appName.
  useEffect(() => {
    let cancelled = false;
    applicationDetailService
      .fetch<LeaveDetailsPayload>(entry.appName, {
        endpoint: entry.detail?.endpoint,
        apiVersion: entry.detail?.apiVersion,
      })
      .then((d: LeaveDetailsPayload) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load details');
      });
    return () => {
      cancelled = true;
    };
  }, [entry.appName, entry.detail?.endpoint, entry.detail?.apiVersion]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.ekRed, fontSize: widgetTheme.fontSize.label }}>{error}</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.ekRed} />
      </View>
    );
  }

  const today = startOfDay(new Date());
  const sorted = [...data.items].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <SummaryCard payload={data} />

      <SectionLabel title="LEAVE HISTORY" />
      <View style={{ gap: 10 }}>
        {sorted.map(item => (
          <LeaveCard key={item.id} item={item} isPast={isPast(item, today)} />
        ))}
      </View>
    </View>
  );
};

const SummaryCard: React.FC<{ payload: LeaveDetailsPayload }> = ({ payload }) => {
  const theme = useTheme();
  const { balance, approvedCount, items } = payload;
  const remaining = balance.total - balance.used;
  const usedPct = (balance.used / Math.max(balance.total, 1)) * 100;
  const approved = approvedCount > 0 ? approvedCount : items.filter(i => i.status === 'approved').length;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <UsageDonut percent={usedPct} size={92} stroke={9} />
        <View style={{ flex: 1, gap: 8 }}>
          <Stat
            label="Days remaining"
            value={`${remaining}`}
            unit={balance.unit}
            color={theme.colors.ink}
          />
          <Stat
            label="Approved leaves"
            value={`${approved}`}
            unit={approved === 1 ? 'leave' : 'leaves'}
            color={theme.colors.green}
          />
          <Stat
            label="Pending"
            value={`${balance.pending}`}
            unit="awaiting"
            color={theme.colors.amber}
          />
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: theme.colors.line, marginTop: 14, marginBottom: 12 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Caption label="Used" value={`${balance.used} / ${balance.total} days`} />
        <Caption label="Total" value={`${balance.total} days`} alignRight />
      </View>
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: string; unit: string; color: string }> = ({ label, value, unit, color }) => {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 1 }}>
        <Text style={{ fontSize: widgetTheme.fontSize.headline, fontWeight: widgetTheme.fontWeight.heavy, color, letterSpacing: -0.4 }}>
          {value}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
          {unit}
        </Text>
      </View>
    </View>
  );
};

const Caption: React.FC<{ label: string; value: string; alignRight?: boolean }> = ({ label, value, alignRight }) => {
  const theme = useTheme();
  return (
    <View style={{ alignItems: alignRight ? 'flex-end' : 'flex-start' }}>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.ink, fontWeight: widgetTheme.fontWeight.semibold, marginTop: 1 }}>
        {value}
      </Text>
    </View>
  );
};

const UsageDonut: React.FC<{ percent: number; size: number; stroke: number }> = ({ percent, size, stroke }) => {
  const theme = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.colors.bg} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.ekRed}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: widgetTheme.fontSize.headline, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink, letterSpacing: -0.4 }}>
          {Math.round(percent)}%
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.6, marginTop: -2 }}>
          USED
        </Text>
      </View>
    </View>
  );
};

const LeaveCard: React.FC<{ item: LeaveItem; isPast: boolean }> = ({ item, isPast }) => {
  const theme = useTheme();
  const tone = statusTone(item.status, theme);
  return (
    <Card style={isPast ? { opacity: 0.7 } : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 4,
            alignSelf: 'stretch',
            borderRadius: 2,
            backgroundColor: tone.bar,
          }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontSize: widgetTheme.fontSize.titleSm, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }}>
              {item.leaveType}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {isPast ? <PastBadge /> : null}
              <StatusBadge status={item.status} />
            </View>
          </View>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, marginTop: 4 }}>
            {formatRange(item.startDate, item.endDate)} · {durationDays(item.startDate, item.endDate)} day
            {durationDays(item.startDate, item.endDate) === 1 ? '' : 's'}
          </Text>
          {item.reason ? (
            <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.inkSecondary, marginTop: 6 }} numberOfLines={2}>
              {item.reason}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const StatusBadge: React.FC<{ status: LeaveStatus }> = ({ status }) => {
  const theme = useTheme();
  const tone = statusTone(status, theme);
  return (
    <View style={{ backgroundColor: tone.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: tone.fg, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {status}
      </Text>
    </View>
  );
};

const PastBadge: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.6 }}>
        PAST
      </Text>
    </View>
  );
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: widgetTheme.fontSize.body,
        fontWeight: widgetTheme.fontWeight.bold,
        color: theme.colors.muted,
        letterSpacing: 1.5,
        paddingHorizontal: 4,
      }}>
      {title}
    </Text>
  );
};

function statusTone(
  status: LeaveStatus,
  theme: ReturnType<typeof useTheme>,
): { bg: string; fg: string; bar: string } {
  switch (status) {
    case 'approved':
      return { bg: theme.colors.greenSoft, fg: theme.colors.green, bar: theme.colors.green };
    case 'rejected':
      return { bg: 'rgba(198,12,48,0.10)', fg: theme.colors.ekRed, bar: theme.colors.ekRed };
    case 'cancelled':
      return { bg: theme.colors.bg, fg: theme.colors.muted, bar: theme.colors.line };
    case 'pending':
      return { bg: theme.colors.amberSoft, fg: theme.colors.amber, bar: theme.colors.amber };
  }
}

function isPast(item: LeaveItem, today: Date): boolean {
  return new Date(item.endDate).getTime() < today.getTime();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function durationDays(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-GB', opts);
  const e = new Date(end).toLocaleDateString('en-GB', opts);
  return `${s} → ${e}`;
}

const styles = StyleSheet.create({
  center: { paddingTop: 80, alignItems: 'center', justifyContent: 'center' },
});
