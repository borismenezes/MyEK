import React from 'react';
import { Text, View } from 'react-native';
import { Icon, useTheme, widgetTheme } from '@myek/ui';
import type { TimesheetPayload, WidgetProps } from '../types';

/**
 * Timesheet tile — federated `timesheet` remote widget. Faithful port of the
 * host's HoursProgressWidget styled with @myek/ui. Data via props.
 */
export const TimesheetWidget: React.FC<WidgetProps<TimesheetPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  const short = Math.max(0, data.weekTarget - data.weekHours);
  const label = (config as { applicationName?: string })?.applicationName ?? 'TIMESHEET';
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: 'rgba(198,12,48,0.10)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="timesheet" size={12} color={theme.colors.ekRed} />
        </View>
        <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.mutedStrong, textTransform: 'uppercase', letterSpacing: 0.2 }}>
          {label}
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontSize: widgetTheme.fontSize.displayLg, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: -1, color: theme.colors.ink, lineHeight: 32 }}>
          {data.weekHours}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>hrs</Text>
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }}>
        This week{short > 0 ? ` · ${short}h short` : ' · on target'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {Array.from({ length: data.daysInWeek }).map((_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 16, borderRadius: 4, backgroundColor: i < data.daysWorked ? theme.colors.ekRed : theme.colors.bg }}
          />
        ))}
      </View>
    </View>
  );
};
