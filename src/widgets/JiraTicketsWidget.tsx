import React from 'react';
import { Text, View } from 'react-native';
import { useTheme, widgetTheme } from '@theme/index';
import type { JiraTicketsPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

/**
 * JiraTicketsWidget (small) — total open ticket count plus a single inline
 * status breakdown row (To Do / In Progress / Blocked) with coloured dots.
 *
 * Optimised for the small tile: hero number on top, label below, three
 * compact status cells across the bottom — each cell is dot + count above
 * a tiny label, so all three statuses fit on one line.
 */
export const JiraTicketsWidget: React.FC<WidgetProps<JiraTicketsPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  const { byStatus } = data;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <WidgetHeader icon="layers" label={config.applicationName ?? 'JIRA TICKETS'} />
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text
          style={{
            fontSize: widgetTheme.fontSize.hero,
            fontWeight: widgetTheme.fontWeight.heavy,
            letterSpacing: -1,
            color: theme.colors.ink,
            lineHeight: 36,
          }}>
          {data.total}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
          open
        </Text>
      </View>
      <View style={{ height: 1, backgroundColor: theme.colors.line, marginTop: 6 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <StatusCell color={theme.colors.muted} label="Todo" count={byStatus.todo} />
        <StatusCell color={theme.colors.amber} label="Active" count={byStatus.inProgress} />
        <StatusCell color={theme.colors.ekRed} label="Blocked" count={byStatus.blocked} />
      </View>
    </View>
  );
};

const StatusCell: React.FC<{ color: string; label: string; count: number }> = ({ color, label, count }) => {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'flex-start', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <Text style={{ fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink }}>
          {count}
        </Text>
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold, letterSpacing: 0.4, marginTop: 1 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
};
