import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import { formatMinutes } from '@utils/index';
import type { AttendancePayload, WidgetProps } from '@/types';

/**
 * ProgressRingWidget — generic, application-agnostic value-inside-circular-progress tile.
 *
 * Originally named `AttendanceWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const ProgressRingWidget: React.FC<WidgetProps<AttendancePayload>> = ({ config, data }) => {
  if (!data) return null;
  if (config.layout.size === 'small') return <ProgressRingSmall data={data} />;
  return <ProgressRingLarge data={data} />;
};

const ProgressRingSmall: React.FC<{ data: AttendancePayload }> = ({ data }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
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
          <Icon name="clock" size={12} color={theme.colors.green} />
        </View>
        <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.mutedStrong, textTransform: 'uppercase' }}>
          Attendance
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ring size={76} percent={75} color={theme.colors.green} bg={theme.colors.bg}>
          <Text style={{ fontSize: widgetTheme.fontSize.value, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink }}>{formatMinutes(data.todayDurationMinutes)}</Text>
          <Text style={{ fontSize: widgetTheme.fontSize.xs, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.3 }}>TODAY</Text>
        </Ring>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: data.checkedIn ? theme.colors.green : theme.colors.muted }}
        />
        <Text style={{ fontSize: widgetTheme.fontSize.caption, color: theme.colors.muted }}>
          {data.checkedIn ? `Checked in · ${formatTime(data.checkInAt)}` : 'Not checked in'}
        </Text>
      </View>
    </View>
  );
};

const ProgressRingLarge: React.FC<{ data: AttendancePayload }> = ({ data }) => {
  const theme = useTheme();
  const weeklyPct = (data.weeklyActualMinutes / Math.max(data.weeklyTargetMinutes, 1)) * 100;
  return (
    <View style={{ flex: 1 }}>
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
          <Icon name="clock" size={12} color={theme.colors.green} />
        </View>
        <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.mutedStrong, textTransform: 'uppercase' }}>
          Attendance
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 }}>
        <Ring size={92} percent={Math.min(weeklyPct, 100)} color={theme.colors.green} bg={theme.colors.bg}>
          <Text style={{ fontSize: widgetTheme.fontSize.titleMd, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink }}>{formatMinutes(data.todayDurationMinutes)}</Text>
          <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.3 }}>TODAY</Text>
        </Ring>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }}>This week</Text>
          <Text style={{ fontSize: widgetTheme.fontSize.titleMd, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink, marginTop: 2 }}>
            {formatMinutes(data.weeklyActualMinutes)} / {formatMinutes(data.weeklyTargetMinutes)}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              backgroundColor: data.checkedIn ? theme.colors.greenSoft : theme.colors.bg,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              alignSelf: 'flex-start',
            }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: data.checkedIn ? theme.colors.green : theme.colors.muted,
              }}
            />
            <Text
              style={{
                fontSize: widgetTheme.fontSize.label,
                fontWeight: widgetTheme.fontWeight.semibold,
                color: data.checkedIn ? theme.colors.green : theme.colors.muted,
              }}>
              {data.checkedIn ? `In since ${formatTime(data.checkInAt)}` : 'Not checked in'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const Ring: React.FC<{ size: number; percent: number; color: string; bg: string; children: React.ReactNode }> = ({
  size,
  percent,
  color,
  bg,
  children,
}) => {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={bg} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
};

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
