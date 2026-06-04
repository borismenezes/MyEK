import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Icon } from '@components/index';
import { useTheme } from '@theme/index';

interface PlanRow {
  windowLabel: string;
  takesDays: number;
  yieldsDays: number;
  detail: string;
}

const ROWS: PlanRow[] = [
  {
    windowLabel: 'Wed 27 – Sun 31 May',
    takesDays: 3,
    yieldsDays: 5,
    detail: 'Bridges the public holiday on Mon 25 + weekend',
  },
  {
    windowLabel: 'Mon 22 – Fri 26 Jun',
    takesDays: 4,
    yieldsDays: 9,
    detail: 'Frames the Eid weekend on both sides',
  },
  {
    windowLabel: 'Thu 17 – Sun 20 Jul',
    takesDays: 2,
    yieldsDays: 4,
    detail: 'Long weekend, light meeting load',
  },
];

/**
 * Pictorial answer for "best days to plan leave". Lists 3 candidate windows
 * with a small ratio chip showing leverage (days taken vs days off).
 */
export const LeavePlanAnswer: React.FC = () => {
  const theme = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="calendar" size={16} color={theme.colors.ekRed} />
        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.muted, letterSpacing: 1.4 }}>
          BEST WINDOWS THIS QUARTER
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {ROWS.map((row, i) => (
          <View
            key={row.windowLabel}
            style={{
              paddingTop: i === 0 ? 0 : 10,
              borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.line,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.ink }}>
                {row.windowLabel}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: theme.colors.greenSoft,
                }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.green, letterSpacing: 0.4 }}>
                  {row.takesDays} → {row.yieldsDays} OFF
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 4 }}>{row.detail}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
