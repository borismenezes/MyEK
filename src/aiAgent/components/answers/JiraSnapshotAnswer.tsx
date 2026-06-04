import React from 'react';
import { Text, View } from 'react-native';
import { Card, Icon } from '@components/index';
import { useTheme } from '@theme/index';

interface Row {
  status: string;
  count: number;
  tone: 'muted' | 'amber' | 'red';
}

const ROWS: Row[] = [
  { status: 'To do', count: 2, tone: 'muted' },
  { status: 'In progress', count: 3, tone: 'amber' },
  { status: 'Blocked', count: 1, tone: 'red' },
];

/**
 * Pictorial breakdown of the user's open Jira tickets by workflow stage —
 * matches the small home-grid Jira widget visually but with full-row
 * labels instead of compact dot+count cells.
 */
export const JiraSnapshotAnswer: React.FC = () => {
  const theme = useTheme();
  const total = ROWS.reduce((s, r) => s + r.count, 0);
  const toneColor = (t: Row['tone']) =>
    t === 'amber' ? theme.colors.amber : t === 'red' ? theme.colors.ekRed : theme.colors.muted;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="layers" size={16} color={theme.colors.ekRed} />
        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.muted, letterSpacing: 1.4 }}>
          OPEN TICKETS
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: theme.colors.ink, letterSpacing: -1 }}>
          {total}
        </Text>
        <Text style={{ fontSize: 13, color: theme.colors.muted }}>assigned to you</Text>
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        {ROWS.map(row => (
          <View key={row.status} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: toneColor(row.tone) }} />
            <Text style={{ flex: 1, fontSize: 14, color: theme.colors.ink, fontWeight: '600' }}>
              {row.status}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.ink }}>{row.count}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
