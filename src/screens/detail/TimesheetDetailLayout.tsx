import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card } from '@components/index';
import { applicationDetailService } from '@services/applicationDetailService';
import { useTheme, widgetTheme } from '@theme/index';
import type { TimesheetDayRecord, TimesheetDetailsPayload, TimesheetEntry } from '@/types';
import type { DetailLayoutProps } from './DetailLayoutRegistry';

/**
 * Detail layout for `manifest.detail.layout === 'timesheetLog'`.
 *
 * Renders the last fortnight of timesheet entries grouped by day:
 *  - Summary card with total billed hours and a count of under-target days.
 *  - One day card per record, listing every `entry` (story + taxonomy + hours).
 *  - Days whose `totalHours` fall below the configured `targetHoursPerDay`
 *    are highlighted with an amber accent stripe + pill so the gap is
 *    obvious at a glance. Non-business days are muted instead of flagged.
 */
export const TimesheetDetailLayout: React.FC<DetailLayoutProps> = ({ entry }) => {
  const theme = useTheme();
  const [data, setData] = useState<TimesheetDetailsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    applicationDetailService
      .fetch<TimesheetDetailsPayload>(entry.appName, {
        endpoint: entry.detail?.endpoint,
        apiVersion: entry.detail?.apiVersion,
      })
      .then((d: TimesheetDetailsPayload) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load timesheet');
      });
    return () => {
      cancelled = true;
    };
  }, [entry.appName, entry.detail?.endpoint, entry.detail?.apiVersion]);

  // Newest day on top — easier to scan recent work. Computed unconditionally
  // so the hook order stays stable across the loading → loaded transition.
  const sortedDays = useMemo(
    () =>
      data
        ? [...data.days].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [],
    [data],
  );

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
      <SummaryCard payload={data} />

      <SectionLabel title="DAILY LOG" />
      <View style={{ gap: 10 }}>
        {sortedDays.map(day => (
          <DayCard key={day.date} day={day} target={data.targetHoursPerDay} />
        ))}
      </View>
    </View>
  );
};

const SummaryCard: React.FC<{ payload: TimesheetDetailsPayload }> = ({ payload }) => {
  const theme = useTheme();
  const summary = useMemo(() => deriveSummary(payload), [payload]);
  return (
    <Card>
      <Text style={{ fontSize: widgetTheme.fontSize.caption, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 1.2 }}>
        {formatRangeHeader(payload.rangeStartDate, payload.rangeEndDate)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: widgetTheme.fontSize.hero, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink, letterSpacing: -1, lineHeight: 38 }}>
            {formatHours(summary.totalHours)}
          </Text>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
            total billed
          </Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Stat label="On target" value={`${summary.onTarget}/${summary.businessDays}`} color={theme.colors.green} />
          <Stat label="Under target" value={`${summary.underTarget}`} color={theme.colors.amber} />
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

const DayCard: React.FC<{ day: TimesheetDayRecord; target: number }> = ({ day, target }) => {
  const theme = useTheme();
  const tone = classifyDay(day, target);
  const palette = tonePalette(tone, theme);

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: palette.accent }} />
      <View style={{ flex: 1 }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.ink, fontWeight: widgetTheme.fontWeight.bold }}>
                  {longDayLabel(day)}
                </Text>
                <DayTotalPill tone={tone} totalHours={day.totalHours} target={target} palette={palette} />
              </View>
              <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, letterSpacing: 0.6, fontWeight: widgetTheme.fontWeight.semibold }}>
                {day.entries.length === 0
                  ? tone === 'weekend' ? 'WEEKEND' : 'NO ENTRIES'
                  : `${day.entries.length} ENTR${day.entries.length === 1 ? 'Y' : 'IES'}`}
              </Text>
            </View>
          </View>

          {day.entries.length > 0 ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              {day.entries.map((e, i) => (
                <EntryRow key={e.id} entry={e} divider={i < day.entries.length - 1} />
              ))}
            </View>
          ) : null}
        </Card>
      </View>
    </View>
  );
};

const EntryRow: React.FC<{ entry: TimesheetEntry; divider: boolean }> = ({ entry, divider }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.line,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.ink, fontWeight: widgetTheme.fontWeight.semibold }} numberOfLines={2}>
            {entry.story}
          </Text>
          <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, marginTop: 2, letterSpacing: 0.3, fontWeight: widgetTheme.fontWeight.semibold }}>
            {entry.taxonomy.toUpperCase()}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.ink, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: -0.2 }}>
            {formatHours(entry.hours)}
          </Text>
        </View>
      </View>
      {divider ? null : null}
    </View>
  );
};

type Tone = 'complete' | 'short' | 'weekend';

interface TonePalette {
  softBg: string;
  strongFg: string;
  accent: string;
}

function tonePalette(tone: Tone, theme: ReturnType<typeof useTheme>): TonePalette {
  if (tone === 'complete') return { softBg: theme.colors.greenSoft, strongFg: theme.colors.green, accent: theme.colors.green };
  if (tone === 'short') return { softBg: theme.colors.amberSoft, strongFg: theme.colors.amber, accent: theme.colors.amber };
  return { softBg: 'rgba(127,127,127,0.12)', strongFg: theme.colors.muted, accent: 'transparent' };
}

function classifyDay(day: TimesheetDayRecord, target: number): Tone {
  if (!day.isBusinessDay) return 'weekend';
  return day.totalHours >= target ? 'complete' : 'short';
}

const DayTotalPill: React.FC<{ tone: Tone; totalHours: number; target: number; palette: TonePalette }> = ({ tone, totalHours, target, palette }) => {
  const label =
    tone === 'weekend'
      ? 'OFF'
      : tone === 'complete'
        ? `${formatHours(totalHours)} · ON TARGET`
        : `${formatHours(totalHours)} / ${formatHours(target)}`;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: palette.softBg }}>
      <Text style={{ fontSize: 10, fontWeight: widgetTheme.fontWeight.heavy, color: palette.strongFg, letterSpacing: 0.8 }}>
        {label}
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

function deriveSummary(payload: TimesheetDetailsPayload) {
  const target = payload.targetHoursPerDay;
  const businessDays = payload.days.filter(d => d.isBusinessDay).length;
  const onTarget = payload.days.filter(d => d.isBusinessDay && d.totalHours >= target).length;
  const underTarget = payload.days.filter(d => d.isBusinessDay && d.totalHours < target).length;
  const weekendDays = payload.days.length - businessDays;
  const totalHours = payload.days.reduce((sum, d) => sum + d.totalHours, 0);
  return { businessDays, onTarget, underTarget, weekendDays, totalHours };
}

function formatHours(hours: number): string {
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

function dayOfMonth(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  return String(d.getDate());
}

function longDayLabel(day: TimesheetDayRecord): string {
  const d = new Date(day.date);
  if (Number.isNaN(d.getTime())) return day.dayOfWeek;
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatRangeHeader(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`.toUpperCase();
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
