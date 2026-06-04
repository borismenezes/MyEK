import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Icon } from '@components/index';
import { useTheme } from '@theme/index';

interface StatTileProps {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value: string;
  caption: string;
  tone: 'amber' | 'green' | 'red' | 'ink';
}

/**
 * 2x2 grid summarising the day — timesheet, meetings, attendance, Jira.
 * Each tile carries an icon, a hero stat, and a short caption that
 * elaborates whether the number is on track or needs action.
 */
export const DaySummaryAnswer: React.FC = () => {
  const theme = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="sparkles" size={16} color={theme.colors.ekRed} />
        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.muted, letterSpacing: 1.4 }}>
          TODAY AT A GLANCE
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        <StatTile
          icon="timesheet"
          label="Timesheet"
          value="4.5h"
          caption="of 8h logged"
          tone="amber"
        />
        <StatTile
          icon="meeting"
          label="Meetings"
          value="3"
          caption="2 pending, 1 done"
          tone="ink"
        />
        <StatTile
          icon="clock"
          label="Attendance"
          value="08:42"
          caption="In · 6h 12m so far"
          tone="green"
        />
        <StatTile
          icon="layers"
          label="Jira"
          value="6"
          caption="2 blocked, 3 active"
          tone="red"
        />
      </View>
    </Card>
  );
};

const StatTile: React.FC<StatTileProps> = ({ icon, label, value, caption, tone }) => {
  const theme = useTheme();
  const toneColor = {
    amber: theme.colors.amber,
    green: theme.colors.green,
    red: theme.colors.ekRed,
    ink: theme.colors.ink,
  }[tone];
  return (
    <View style={styles.tile}>
      <View
        style={[
          styles.tileInner,
          { backgroundColor: theme.colors.bg, borderColor: theme.colors.line },
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={icon} size={13} color={theme.colors.muted} />
          <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.muted, letterSpacing: 1.2 }}>
            {label.toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: toneColor, letterSpacing: -0.5, marginTop: 6 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>{caption}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: '50%',
    padding: 4,
  },
  tileInner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 10,
  },
});
