import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, Icon } from '@components/index';
import { useAuthStore } from '@store/useAuthStore';
import { useUIStore } from '@store/useUIStore';
import { useTheme } from '@theme/index';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const openIdSheet = useUIStore(s => s.setIdSheetVisible);

  if (!user) return null;

  // Staff number from Graph /me (user.staffId), "S"-prefixed. Empty until /me lands.
  const rawStaffId = user.staffId ?? '';
  const staffId = rawStaffId && !/^s/i.test(rawStaffId) ? `S${rawStaffId}` : rawStaffId;

  const rows = [
    { i: 'mail', t: 'Email', s: user.email },
    { i: 'building', t: 'Department', s: user.department },
    { i: 'medal', t: 'Grade', s: user.grade ?? '' },
    { i: 'pin', t: 'Location', s: user.location ?? '' },
    {
      i: 'calendar',
      t: 'Joined',
      s: user.joinedAt
        ? new Date(user.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '',
    },
  ].filter(r => r.s); // hide rows with no value (no fake placeholders)

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, paddingTop: insets.top + 8 },
        ]}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.5 }}>My Profile</Text>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, alignItems: 'center' }}>
          <Pressable
            onPress={() => openIdSheet(true)}
            accessibilityLabel="Open employee ID card"
            accessibilityRole="button"
            hitSlop={6}>
            <Avatar size={68} ring />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.muted, marginTop: 2 }}>{user.jobTitle}</Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 4 }}>ID: {staffId || '—'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <SectionHeader title="DETAILS" />
          <Card padded={false}>
            {rows.map((r, idx) => (
              <ProfileItem
                key={r.t}
                icon={r.i}
                title={r.t}
                subtitle={r.s}
                divider={idx < rows.length - 1}
              />
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

interface ProfileItemProps {
  icon: string;
  title: string;
  subtitle: string;
  divider: boolean;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon, title, subtitle, divider }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: theme.colors.line,
      }}>
      <View style={[styles.iconBubble, { backgroundColor: 'rgba(196,158,78,0.10)' }]}>
        <Icon name={icon as any} size={18} color={theme.colors.ekGold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.muted,
        letterSpacing: 1.5,
        paddingHorizontal: 4,
        marginTop: 4,
        marginBottom: 4,
      }}>
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
