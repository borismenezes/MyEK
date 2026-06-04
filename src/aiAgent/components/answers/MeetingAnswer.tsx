import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Icon } from '@components/index';
import { useTheme } from '@theme/index';

const MEETING = {
  title: 'MyEK Platform Sync',
  startLabel: '11:00',
  endLabel: '12:00',
  location: 'Microsoft Teams',
  organizer: 'Boris Menezes',
  attendees: 6,
};

/**
 * Mini "next meeting" card — one-glance summary of the upcoming calendar
 * slot. Designed to read as the agent surfacing the most important item
 * from the user's Outlook calendar without dumping the whole day's list.
 */
export const MeetingAnswer: React.FC = () => {
  const theme = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 4, height: 32, backgroundColor: theme.colors.ekRed, borderRadius: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.muted, letterSpacing: 1.2 }}>
            NEXT UP · STARTS IN 18 MIN
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.ink, marginTop: 2 }} numberOfLines={1}>
            {MEETING.title}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: 'rgba(198,12,48,0.10)',
          }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.ekRed, letterSpacing: 0.6 }}>
            {MEETING.startLabel}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.line,
          gap: 8,
        }}>
        <Row icon="meeting" label="Location" value={MEETING.location} />
        <Row icon="user" label="Organiser" value={MEETING.organizer} />
        <Row icon="clock" label="Window" value={`${MEETING.startLabel} – ${MEETING.endLabel} · ${MEETING.attendees} attendees`} />
      </View>
    </Card>
  );
};

const Row: React.FC<{
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value: string;
}> = ({ icon, label, value }) => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon name={icon} size={14} color={theme.colors.muted} />
      <Text style={{ width: 70, fontSize: 11, fontWeight: '700', color: theme.colors.muted, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ flex: 1, fontSize: 13, color: theme.colors.ink }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};
