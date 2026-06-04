import React from 'react';
import { Text, View } from 'react-native';
import { useTheme, widgetTheme } from '@theme/index';
import type { TimesheetPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

/**
 * Timesheet widget (small) — current-week hours plus a strip of day cells.
 * Cells are filled with the brand red up to `daysWorked`; remaining cells
 * sit muted to convey "still to log".
 */
/**
 * HoursProgressWidget — generic, application-agnostic hours logged with weekly progress tile.
 *
 * Originally named `TimesheetWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const HoursProgressWidget: React.FC<WidgetProps<TimesheetPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  const short = Math.max(0, data.weekTarget - data.weekHours);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <WidgetHeader icon="timesheet" label={config.applicationName ?? "TIMESHEET"} />
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text
          style={{
            fontSize: widgetTheme.fontSize.displayLg,
            fontWeight: widgetTheme.fontWeight.heavy,
            letterSpacing: -1,
            color: theme.colors.ink,
            lineHeight: 32,
          }}>
          {data.weekHours}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>hrs</Text>
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }}>
        This week{short > 0 ? ` · ${short}h short` : ' · on target'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {Array.from({ length: data.daysInWeek }).map((_, i) => {
          const filled = i < data.daysWorked;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 16,
                borderRadius: 4,
                backgroundColor: filled ? theme.colors.ekRed : theme.colors.bg,
              }}
            />
          );
        })}
      </View>
    </View>
  );
};
