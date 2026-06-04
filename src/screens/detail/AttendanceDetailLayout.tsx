import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card } from '@components/index';
import { applicationDetailService } from '@services/applicationDetailService';
import { useTheme, widgetTheme } from '@theme/index';
import type { AttendanceDayRecord, AttendanceWeekPayload } from '@/types';
import type { DetailLayoutProps } from './DetailLayoutRegistry';

const TARGET_MINUTES = 510; // 8 hours 30 minutes — full working day.

/**
 * Detail layout for `manifest.detail.layout === 'attendanceWeek'`.
 *
 * Renders the signed-in employee's current calendar week:
 *  - Top summary card: business-day count vs. on-target, total hours worked.
 *  - Per-day rows with check-in / check-out times and worked duration.
 *
 * Day colouring:
 *  - Green  → business day with worked time ≥ 8h 30m.
 *  - Amber  → business day with worked time < 8h 30m (or absent).
 *  - Muted  → non-business day (weekend / public holiday).
 */
export const AttendanceDetailLayout: React.FC<DetailLayoutProps> = ({ entry }) => {
  const theme = useTheme();
  const [data, setData] = useState<AttendanceWeekPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    applicationDetailService
      .fetch<AttendanceWeekPayload>(entry.appName, {
        endpoint: entry.detail?.endpoint,
        apiVersion: entry.detail?.apiVersion,
      })
      .then((d: AttendanceWeekPayload) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load attendance');
      });
    return () => {
      cancelled = true;
    };
  }, [entry.appName, entry.detail?.endpoint, entry.detail?.apiVersion]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.ekRed, fontSize: widgetTheme.fontSize.label }}>{error}</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.ekRed} />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <WeekSummaryCard payload={data} />

      <SectionLabel title="THIS WEEK" />
      <View style={{ gap: 10 }}>
        {data.days.map(day => (
          <DayRow key={day.date} day={day} />
        ))}
      </View>
    </View>
  );
};

const WeekSummaryCard: React.FC<{ payload: AttendanceWeekPayload }> = ({ payload }) => {
  const theme = useTheme();
  const summary = useMemo(() => deriveSummary(payload), [payload]);
  return (
    <Card>
      <Text style={{ fontSize: widgetTheme.fontSize.caption, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 1.2 }}>
        WEEK OF {formatWeekHeader(payload.weekStartDate)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: widgetTheme.fontSize.hero, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink, letterSpacing: -1, lineHeight: 38 }}>
            {summary.totalHoursLabel}
          </Text>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
            total worked
          </Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Stat label="On target" value={`${summary.onTarget}/${summary.businessDays}`} color={theme.colors.green} />
          <Stat label="Short days" value={`${summary.shortDays}`} color={theme.colors.amber} />
          <Stat label="Days off" value={`${summary.weekendDays}`} color={theme.colors.muted} />
        </View>
      </View>
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={{ fontSize: widgetTheme.fontSize.body, fontWeight: widgetTheme.fontWeight.heavy, color }}>{value}</Text>
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }}>{label}</Text>
    </View>
  );
};

const DayRow: React.FC<{ day: AttendanceDayRecord }> = ({ day }) => {
  const theme = useTheme();
  const tone = classify(day);
  const palette = tonePalette(tone, theme);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: palette.softBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 10, color: palette.strongFg, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: 1 }}>
            {day.dayOfWeek.toUpperCase()}
          </Text>
          <Text style={{ fontSize: 14, color: palette.strongFg, fontWeight: widgetTheme.fontWeight.heavy, lineHeight: 16 }}>
            {dayOfMonth(day.date)}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.ink, fontWeight: widgetTheme.fontWeight.bold }}>
              {longDayLabel(day)}
            </Text>
            <StatusPill tone={tone} workedMinutes={day.workedMinutes} palette={palette} />
          </View>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TimeCell label="In" iso={day.inTime} muted={tone === 'weekend'} />
            <TimeCell label="Out" iso={day.outTime} muted={tone === 'weekend'} />
            <View style={{ flex: 1 }} />
            <DurationCell minutes={day.workedMinutes} tone={tone} />
          </View>
        </View>
      </View>
    </Card>
  );
};

const TimeCell: React.FC<{ label: string; iso: string | null; muted: boolean }> = ({ label, iso, muted }) => {
  const theme = useTheme();
  const display = iso ? formatTime(iso) : '—';
  return (
    <View>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, letterSpacing: 0.6, fontWeight: widgetTheme.fontWeight.semibold }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: muted ? theme.colors.muted : theme.colors.ink, fontWeight: widgetTheme.fontWeight.semibold }}>
        {display}
      </Text>
    </View>
  );
};

const DurationCell: React.FC<{ minutes: number; tone: Tone }> = ({ minutes, tone }) => {
  const theme = useTheme();
  const palette = tonePalette(tone, theme);
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, letterSpacing: 0.6, fontWeight: widgetTheme.fontWeight.semibold }}>
        WORKED
      </Text>
      <Text style={{ fontSize: widgetTheme.fontSize.body, color: palette.strongFg, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: -0.2 }}>
        {tone === 'weekend' ? '—' : formatDuration(minutes)}
      </Text>
    </View>
  );
};

type Tone = 'complete' | 'short' | 'weekend';

const StatusPill: React.FC<{ tone: Tone; workedMinutes: number; palette: TonePalette }> = ({ tone, palette }) => {
  const label = tone === 'complete' ? 'On target' : tone === 'short' ? 'Short' : 'Off';
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: palette.softBg }}>
      <Text style={{ fontSize: 10, fontWeight: widgetTheme.fontWeight.heavy, color: palette.strongFg, letterSpacing: 0.8 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: widgetTheme.fontSize.caption,
        fontWeight: widgetTheme.fontWeight.bold,
        color: theme.colors.muted,
        letterSpacing: 1.4,
        paddingHorizontal: 4,
        marginTop: 2,
      }}>
      {title}
    </Text>
  );
};

// ─── helpers ─────────────────────────────────────────────────────────

interface TonePalette {
  softBg: string;
  strongFg: string;
}

function tonePalette(tone: Tone, theme: ReturnType<typeof useTheme>): TonePalette {
  if (tone === 'complete') return { softBg: theme.colors.greenSoft, strongFg: theme.colors.green };
  if (tone === 'short') return { softBg: theme.colors.amberSoft, strongFg: theme.colors.amber };
  return { softBg: 'rgba(127,127,127,0.12)', strongFg: theme.colors.muted };
}

function classify(day: AttendanceDayRecord): Tone {
  if (!day.isBusinessDay) return 'weekend';
  return day.workedMinutes >= TARGET_MINUTES ? 'complete' : 'short';
}

function deriveSummary(payload: AttendanceWeekPayload) {
  const businessDays = payload.days.filter(d => d.isBusinessDay).length;
  const onTarget = payload.days.filter(d => d.isBusinessDay && d.workedMinutes >= TARGET_MINUTES).length;
  const shortDays = payload.days.filter(d => d.isBusinessDay && d.workedMinutes < TARGET_MINUTES).length;
  const weekendDays = payload.days.length - businessDays;
  const totalMinutes = payload.days.reduce((sum, d) => sum + d.workedMinutes, 0);
  return {
    businessDays,
    onTarget,
    shortDays,
    weekendDays,
    totalHoursLabel: formatDuration(totalMinutes),
  };
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function dayOfMonth(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  return String(d.getDate());
}

function longDayLabel(day: AttendanceDayRecord): string {
  const d = new Date(day.date);
  if (Number.isNaN(d.getTime())) return day.dayOfWeek;
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatWeekHeader(isoDate: string): string {
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`.toUpperCase();
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
