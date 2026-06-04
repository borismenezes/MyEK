import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import { timeAgo } from '@utils/index';
import type { PayslipPayload, PayslipStatus, WidgetProps } from '@/types';

/**
 * MetricCardWidget — payslip availability tile.
 *
 * Originally a salary KPI tile (`PayslipWidget`) that surfaced the net
 * amount + month-on-month delta. The amount has been removed from the
 * home grid for shoulder-surfing safety: the tile now only signals which
 * payslip is the latest available, with a status pip and a relative
 * "credited X ago" caption. Open the payslip app for figures.
 *
 * Compact by design — registered as `supportedSizes: ['small']` in
 * WidgetRegistry. The large variant is retained as a defensive render
 * path in case an old persisted layout still has size: 'large'.
 */
export const MetricCardWidget: React.FC<WidgetProps<PayslipPayload>> = ({ config, data }) => {
  if (!data) return null;
  if (config.layout.size === 'large') return <PayslipLarge data={data} />;
  return <PayslipSmall data={data} />;
};

const PayslipSmall: React.FC<{ data: PayslipPayload }> = ({ data }) => {
  const theme = useTheme();
  const status = data.status ?? 'available';
  const statusMeta = STATUS_META[status];
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ flex: 1 }} />
      <Text
        style={{
          fontSize: widgetTheme.fontSize.micro,
          color: theme.colors.muted,
          fontWeight: widgetTheme.fontWeight.bold,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}>
        Latest payslip
      </Text>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.titleLg,
          fontWeight: widgetTheme.fontWeight.heavy,
          color: theme.colors.ink,
          letterSpacing: -0.3,
          marginTop: 2,
        }}
        numberOfLines={1}>
        {data.monthLabel}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: statusMeta.dot(theme),
          }}
        />
        <Text
          style={{
            fontSize: widgetTheme.fontSize.label,
            fontWeight: widgetTheme.fontWeight.semibold,
            color: statusMeta.fg(theme),
          }}>
          {statusMeta.label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.micro,
          color: theme.colors.muted,
          marginTop: 4,
          fontWeight: widgetTheme.fontWeight.semibold,
        }}>
        {timeAgo(new Date(data.creditedAt).getTime()).toUpperCase()}
      </Text>
    </View>
  );
};

const PayslipLarge: React.FC<{ data: PayslipPayload }> = ({ data }) => {
  const theme = useTheme();
  const status = data.status ?? 'available';
  const statusMeta = STATUS_META[status];
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ marginTop: 14, flex: 1 }}>
        <Text
          style={{
            fontSize: widgetTheme.fontSize.label,
            color: theme.colors.muted,
            fontWeight: widgetTheme.fontWeight.semibold,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          Latest payslip
        </Text>
        <Text
          style={{
            fontSize: widgetTheme.fontSize.headline,
            fontWeight: widgetTheme.fontWeight.heavy,
            color: theme.colors.ink,
            letterSpacing: -0.4,
            marginTop: 4,
          }}>
          {data.monthLabel}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: statusMeta.bg(theme),
          }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: statusMeta.dot(theme),
            }}
          />
          <Text
            style={{
              fontSize: widgetTheme.fontSize.label,
              fontWeight: widgetTheme.fontWeight.bold,
              color: statusMeta.fg(theme),
            }}>
            {statusMeta.label}
          </Text>
        </View>
        <Text
          style={{
            fontSize: widgetTheme.fontSize.label,
            color: theme.colors.muted,
            marginTop: 16,
          }}>
          Credited {timeAgo(new Date(data.creditedAt).getTime())}
        </Text>
      </View>
    </View>
  );
};

const Header: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          backgroundColor: theme.colors.greenSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="wallet" size={12} color={theme.colors.green} />
      </View>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.label,
          fontWeight: widgetTheme.fontWeight.bold,
          color: theme.colors.mutedStrong,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}>
        Payslip
      </Text>
    </View>
  );
};

interface StatusVisual {
  label: string;
  dot: (theme: ReturnType<typeof useTheme>) => string;
  fg: (theme: ReturnType<typeof useTheme>) => string;
  bg: (theme: ReturnType<typeof useTheme>) => string;
}

const STATUS_META: Record<PayslipStatus, StatusVisual> = {
  available: {
    label: 'Available',
    dot: t => t.colors.green,
    fg: t => t.colors.green,
    bg: t => t.colors.greenSoft,
  },
  pending: {
    label: 'Processing',
    dot: t => t.colors.amber,
    fg: t => t.colors.amber,
    bg: t => t.colors.amberSoft,
  },
  unavailable: {
    label: 'Not yet released',
    dot: t => t.colors.muted,
    fg: t => t.colors.muted,
    bg: t => t.colors.bg,
  },
};
