import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme, widgetTheme } from '@myek/ui';
import type { AttendancePayload, WidgetProps } from '../types';

/**
 * Attendance tile — the `attendance` remote's federated home widget. A faithful
 * port of the host's ProgressRingWidget (SVG ring), styled with the shared
 * @myek/ui tokens so it's identical to the in-host fallback. Data via props.
 */
export const AttendanceWidget: React.FC<WidgetProps<AttendancePayload>> = ({ config, data }) => {
  if (!data) return null;
  const size = (config?.layout as { size?: string } | undefined)?.size ?? config?.size;
  return size === 'small' ? <RingSmall data={data} /> : <RingLarge data={data} />;
};

const RingSmall: React.FC<{ data: AttendancePayload }> = ({ data }) => (
  <View style={{ flex: 1 }}>
    <Header />
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Ring size={76} percent={75}>
        <Text style={{ fontSize: widgetTheme.fontSize.value, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink }}>{formatMinutes(data.todayDurationMinutes)}</Text>
        <Text style={{ fontSize: widgetTheme.fontSize.xs, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.3 }}>TODAY</Text>
      </Ring>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Dot on={data.checkedIn} />
      <Text style={{ fontSize: widgetTheme.fontSize.caption, color: theme.colors.muted }}>
        {data.checkedIn ? `Checked in · ${formatTime(data.checkInAt)}` : 'Not checked in'}
      </Text>
    </View>
  </View>
);

const RingLarge: React.FC<{ data: AttendancePayload }> = ({ data }) => {
  const weeklyPct = (data.weeklyActualMinutes / Math.max(data.weeklyTargetMinutes, 1)) * 100;
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 }}>
        <Ring size={92} percent={Math.min(weeklyPct, 100)}>
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
              flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
              backgroundColor: data.checkedIn ? theme.colors.greenSoft : theme.colors.bg,
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start',
            }}>
            <Dot on={data.checkedIn} />
            <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.semibold, color: data.checkedIn ? theme.colors.green : theme.colors.muted }}>
              {data.checkedIn ? `In since ${formatTime(data.checkInAt)}` : 'Not checked in'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const Header: React.FC = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: theme.colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 11 }}>🕐</Text>
    </View>
    <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.mutedStrong, textTransform: 'uppercase' }}>
      Attendance
    </Text>
  </View>
);

const Dot: React.FC<{ on: boolean }> = ({ on }) => (
  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? theme.colors.green : theme.colors.muted }} />
);

const Ring: React.FC<{ size: number; percent: number; children: React.ReactNode }> = ({ size, percent, children }) => {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.colors.bg} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius} stroke={theme.colors.green} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
