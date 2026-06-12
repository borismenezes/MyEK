import React from 'react';
import { Text, View } from 'react-native';
import { Icon, useTheme, widgetTheme, type Theme } from '@myek/ui';
import type { PayslipPayload, PayslipStatus, WidgetProps } from '../types';

/**
 * Payslip availability tile — federated `payslip` remote widget. Faithful port
 * of the host's MetricCardWidget styled with @myek/ui. Data via props.
 */
export const PayslipWidget: React.FC<WidgetProps<PayslipPayload>> = ({ config, data }) => {
  if (!data) return null;
  const size = (config?.layout as { size?: string } | undefined)?.size ?? config?.size;
  return size === 'large' ? <PayslipLarge data={data} /> : <PayslipSmall data={data} />;
};

const statusMeta = (
  theme: Theme,
): Record<PayslipStatus, { label: string; dot: string; fg: string; bg: string }> => ({
  available: { label: 'Available', dot: theme.colors.green, fg: theme.colors.green, bg: theme.colors.greenSoft },
  pending: { label: 'Processing', dot: theme.colors.amber, fg: theme.colors.amber, bg: theme.colors.amberSoft },
  unavailable: { label: 'Not yet released', dot: theme.colors.muted, fg: theme.colors.muted, bg: theme.colors.bg },
});

const PayslipSmall: React.FC<{ data: PayslipPayload }> = ({ data }) => {
  const theme = useTheme();
  const m = statusMeta(theme)[data.status ?? 'available'];
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ flex: 1 }} />
      <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.bold, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        Latest payslip
      </Text>
      <Text style={{ fontSize: widgetTheme.fontSize.titleLg, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink, letterSpacing: -0.3, marginTop: 2 }} numberOfLines={1}>
        {data.monthLabel}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.dot }} />
        <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.semibold, color: m.fg }}>{m.label}</Text>
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, marginTop: 4, fontWeight: widgetTheme.fontWeight.semibold }}>
        {timeAgo(new Date(data.creditedAt).getTime()).toUpperCase()}
      </Text>
    </View>
  );
};

const PayslipLarge: React.FC<{ data: PayslipPayload }> = ({ data }) => {
  const theme = useTheme();
  const m = statusMeta(theme)[data.status ?? 'available'];
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ marginTop: 14, flex: 1 }}>
        <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Latest payslip
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.headline, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink, letterSpacing: -0.4, marginTop: 4 }}>
          {data.monthLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: m.bg }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.dot }} />
          <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.bold, color: m.fg }}>{m.label}</Text>
        </View>
        <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, marginTop: 16 }}>Credited {timeAgo(new Date(data.creditedAt).getTime())}</Text>
      </View>
    </View>
  );
};

const Header: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: theme.colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="wallet" size={12} color={theme.colors.green} />
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.mutedStrong, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Payslip
      </Text>
    </View>
  );
};

function timeAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}
