import React from 'react';
import { Text, View } from 'react-native';
import { Pill } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import type { ApplicationStatus, ApplicationsPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

const STATUS_TONE: Record<ApplicationStatus, React.ComponentProps<typeof Pill>['tone']> = {
  submitted: 'blue',
  interview: 'green',
  offer: 'gold',
  rejected: 'red',
};

/**
 * Applications widget (small) — count of active internal job applications
 * plus the most recent role and its current status.
 */
/**
 * CounterTileWidget — generic, application-agnostic big-count-with-status-label tile.
 *
 * Originally named `ApplicationsWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const CounterTileWidget: React.FC<WidgetProps<ApplicationsPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <WidgetHeader icon="briefcase" label={config.applicationName ?? "APPLICATIONS"} />
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
          {data.activeCount}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>active</Text>
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }} numberOfLines={2}>
        {data.topApplication.title}
      </Text>
      <View style={{ marginTop: 2 }}>
        <Pill tone={STATUS_TONE[data.topApplication.status]} size="sm">
          {STATUS_LABEL[data.topApplication.status]}
        </Pill>
      </View>
    </View>
  );
};
