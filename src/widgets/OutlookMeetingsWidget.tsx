import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, widgetTheme } from '@theme/index';
import type { OutlookMeeting, OutlookMeetingsPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

const MAX_VISIBLE = 4;

/**
 * OutlookMeetingsWidget (large) — vertical list of today's meetings.
 *
 * Each row: time block on the left (start–end), title + location on the
 * right. The currently in-progress meeting (server-flagged) gets a red
 * vertical accent bar. Up to MAX_VISIBLE meetings are listed; a trailing
 * "+N more" line surfaces overflow without scrolling inside the tile.
 */
export const OutlookMeetingsWidget: React.FC<WidgetProps<OutlookMeetingsPayload>> = ({ config, data }) => {
  const theme = useTheme();
  if (!data) return null;
  const meetings = data.meetings;
  const visible = meetings.slice(0, MAX_VISIBLE);
  const overflow = meetings.length - visible.length;

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <WidgetHeader icon="calendar" label={config.applicationName ?? 'TODAY · OUTLOOK'} />
        <Text style={{ fontSize: widgetTheme.fontSize.caption, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
          {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
        </Text>
      </View>

      {meetings.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: widgetTheme.fontSize.body, color: theme.colors.muted }}>
            No meetings today
          </Text>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {visible.map(m => (
            <MeetingRow key={m.id} meeting={m} />
          ))}
          {overflow > 0 ? (
            <Text style={{ fontSize: widgetTheme.fontSize.caption, color: theme.colors.muted, marginTop: 2 }}>
              +{overflow} more
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

const MeetingRow: React.FC<{ meeting: OutlookMeeting }> = ({ meeting }) => {
  const theme = useTheme();
  const accent = meeting.isInProgress ? theme.colors.ekRed : theme.colors.line;
  const titleColor = meeting.responseStatus === 'declined' ? theme.colors.muted : theme.colors.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10 }}>
      <View style={{ width: 3, backgroundColor: accent, borderRadius: 2 }} />
      <View style={{ width: 64 }}>
        <Text style={{ fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ink, letterSpacing: -0.2 }}>
          {formatTime(meeting.startAt)}
        </Text>
        <Text style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
          {durationLabel(meeting.startAt, meeting.endAt)}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: widgetTheme.fontSize.label,
              fontWeight: widgetTheme.fontWeight.bold,
              color: titleColor,
              textDecorationLine: meeting.responseStatus === 'declined' ? 'line-through' : 'none',
            }}>
            {meeting.title}
          </Text>
          {meeting.isInProgress ? (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(198,12,48,0.12)' }}>
              <Text style={{ fontSize: 9, fontWeight: widgetTheme.fontWeight.heavy, color: theme.colors.ekRed, letterSpacing: 0.6 }}>
                NOW
              </Text>
            </View>
          ) : null}
        </View>
        {meeting.location ? (
          <Text numberOfLines={1} style={{ fontSize: widgetTheme.fontSize.micro, color: theme.colors.muted, marginTop: 1 }}>
            {meeting.location}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function durationLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return '';
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

// `styles` retained as a no-op for parity with sibling widgets — clean
// hoisting point if shared accents move out of inline style objects.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _styles = StyleSheet.create({});
