import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import type { LeaveBalancePayload, WidgetProps } from '@/types';

/**
 * BalanceMeterWidget — generic, application-agnostic big-number-with-progress-bar tile.
 *
 * Originally named `LeaveWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const BalanceMeterWidget: React.FC<WidgetProps<LeaveBalancePayload>> = ({ config, data }) => {
  if (!data) return null;
  // Header label comes from the manifest (`config.applicationName`) when
  // present so the same template can render "Leave Balance", "Vacation Days",
  // "Sick Leave", etc. The hard-coded fallbacks preserve the legacy look
  // when the widget is rendered without a manifest entry.
  const labelSmall = config.applicationName ?? 'Leave';
  const labelLarge = config.applicationName ?? 'Leave Balance';
  if (config.layout.size === 'small') return <BalanceMeterSmall data={data} label={labelSmall} />;
  return <BalanceMeterLarge data={data} label={labelLarge} />;
};

const BalanceMeterSmall: React.FC<{ data: LeaveBalancePayload; label: string }> = ({ data, label }) => {
  const theme = useTheme();
  const remaining = data.total - data.used;
  const pct = (data.used / Math.max(data.total, 1)) * 100;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Header icon="calendar" label={label} />
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontSize: widgetTheme.fontSize.hero, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: -1, color: theme.colors.ink, lineHeight: 36 }}>
          {remaining}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>days</Text>
      </View>
      <View style={{ height: 4, backgroundColor: theme.colors.bg, borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.colors.ekRed }} />
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.caption, color: theme.colors.muted }}>
        {data.used}/{data.total} used
      </Text>
    </View>
  );
};

const BalanceMeterLarge: React.FC<{ data: LeaveBalancePayload; label: string }> = ({ data, label }) => {
  const theme = useTheme();
  const remaining = data.total - data.used;
  return (
    <View style={{ flex: 1 }}>
      <Header icon="calendar" label={label} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 14 }}>
        <View>
          <Text style={{ fontSize: widgetTheme.fontSize.hero, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: -1, color: theme.colors.ink, lineHeight: 38 }}>
            {remaining}
          </Text>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>days remaining</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Bar label="Used" value={data.used} total={data.total} color={theme.colors.ekRed} />
          <View style={{ height: 6 }} />
          <Bar label="Pending" value={data.pending} total={data.total} color={theme.colors.amber} />
        </View>
      </View>
    </View>
  );
};

const Header: React.FC<{ icon: any; label: string }> = ({ icon, label }) => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          backgroundColor: 'rgba(198,12,48,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={12} color={theme.colors.ekRed} />
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.mutedStrong, letterSpacing: 0.2, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
};

const Bar: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => {
  const theme = useTheme();
  const pct = (value / Math.max(total, 1)) * 100;
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }}>{label}</Text>
        <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.ink, fontWeight: widgetTheme.fontWeight.semibold }}>
          {value}/{total}
        </Text>
      </View>
      <View style={{ height: 5, backgroundColor: theme.colors.bg, borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
};
