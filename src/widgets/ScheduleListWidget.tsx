import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import type { RosterDuty, RosterPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

/**
 * Cabin-Crew Roster widget (large) — week-of-duty list with date column on
 * the left and flight/off-duty info on the right. Hairline dividers separate
 * each duty row.
 */
/**
 * ScheduleListWidget — generic, application-agnostic time-grouped schedule list tile.
 *
 * Originally named `RosterWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const ScheduleListWidget: React.FC<WidgetProps<RosterPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  return (
    <View style={{ flex: 1 }}>
      <WidgetHeader icon="calendar" label={config.applicationName ?? "CABIN CREW ROSTER"} />
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, marginTop: 2 }}>{data.weekLabel}</Text>
      <View style={{ marginTop: 8, paddingBottom: 8 }}>
        {data.duties.map((duty, i) => (
          <DutyRow key={`${duty.dayLabel}-${duty.dayNumber}`} duty={duty} divider={i < data.duties.length - 1} />
        ))}
      </View>
    </View>
  );
};

const DutyRow: React.FC<{ duty: RosterDuty; divider: boolean }> = ({ duty, divider }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 5,
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: theme.colors.line,
      }}>
      <View style={{ width: 32 }}>
        <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.muted, letterSpacing: 0.6 }}>
          {duty.dayLabel}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.value, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink, letterSpacing: -0.4 }}>
          {duty.dayNumber}
        </Text>
      </View>
      {duty.type === 'flight' ? <FlightDuty duty={duty} /> : <OffDuty duty={duty} />}
    </View>
  );
};

const FlightDuty: React.FC<{ duty: RosterDuty }> = ({ duty }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }}>{duty.origin}</Text>
        <Icon name="plane-flat" size={10} color={theme.colors.ekRed} />
        <Text style={{ fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }}>{duty.destination}</Text>
      </View>
      <Text style={{ fontSize: widgetTheme.fontSize.caption, color: theme.colors.muted, marginTop: 1 }}>
        {[duty.flightNumber, duty.duration, duty.role].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
};

const OffDuty: React.FC<{ duty: RosterDuty }> = ({ duty }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }}>{duty.status ?? 'Off Duty'}</Text>
      {duty.note ? (
        <Text style={{ fontSize: widgetTheme.fontSize.caption, color: theme.colors.muted, marginTop: 1 }}>{duty.note}</Text>
      ) : null}
    </View>
  );
};
