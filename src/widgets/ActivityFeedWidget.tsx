import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import type { AppreciationsPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

/**
 * Appreciations widget (large) — surfaces the most recent peer shout-out
 * along with a small count of new appreciations this month.
 */
/**
 * ActivityFeedWidget — generic, application-agnostic recent-activity feed list tile.
 *
 * Originally named `AppreciationsWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const ActivityFeedWidget: React.FC<WidgetProps<AppreciationsPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  const { latest, newThisMonth } = data;
  return (
    <View style={{ flex: 1, gap: 28 }}>
      <View>
        <WidgetHeader
          icon="medal"
          label={config.applicationName ?? 'APPRECIATIONS'}
          iconBg="rgba(196,158,78,0.18)"
          iconColor={theme.colors.ekGold}
        />
        <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, marginTop: 4 }}>
          {newThisMonth} new this month
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(196,158,78,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="medal" size={18} color={theme.colors.ekGold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink, lineHeight: 18 }} numberOfLines={3}>
            “{latest.quote}”
          </Text>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, marginTop: 6 }} numberOfLines={1}>
            {latest.author} · {latest.role} · {formatDaysAgo(latest.daysAgo)}
          </Text>
        </View>
      </View>
    </View>
  );
};

function formatDaysAgo(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return '1 day ago';
  return `${n} days ago`;
}
