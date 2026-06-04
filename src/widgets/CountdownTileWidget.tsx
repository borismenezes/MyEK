import React from 'react';
import { Text, View } from 'react-native';
import { Pill } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import type { DocumentsPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

/**
 * Documents widget (small) — surfaces the next document to expire.
 * Number colour and pill tone reflect urgency: amber = renew_soon,
 * red = expired, green = valid.
 */
/**
 * CountdownTileWidget — generic, application-agnostic days-to-expiry countdown tile.
 *
 * Originally named `DocumentsWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const CountdownTileWidget: React.FC<WidgetProps<DocumentsPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  const numberColor =
    data.status === 'expired'
      ? theme.colors.ekRed
      : data.status === 'renew_soon'
        ? theme.colors.amber
        : theme.colors.green;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <WidgetHeader icon="passport" label={config.applicationName ?? "DOCUMENTS"} />
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text
          style={{
            fontSize: widgetTheme.fontSize.displayLg,
            fontWeight: widgetTheme.fontWeight.heavy,
            letterSpacing: -1,
            color: numberColor,
            lineHeight: 32,
          }}>
          {data.daysUntilExpiry}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>days</Text>
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }} numberOfLines={1}>
        {data.documentLabel}
      </Text>
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }} numberOfLines={1}>
        {data.expiryDate} · {data.documentNumber}
      </Text>
      {data.status === 'renew_soon' ? (
        <View style={{ marginTop: 2 }}>
          <Pill tone="amber" size="sm">
            Renew soon
          </Pill>
        </View>
      ) : data.status === 'expired' ? (
        <View style={{ marginTop: 2 }}>
          <Pill tone="red" size="sm">
            Expired
          </Pill>
        </View>
      ) : null}
    </View>
  );
};
