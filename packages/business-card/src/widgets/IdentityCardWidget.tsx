import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Icon, useTheme, widgetTheme } from '@myek/ui';
import { buildVCard, getPlatformUser, openProfile } from '@myek/platform';
import type { BusinessCardPayload, WidgetProps } from '../types';

/**
 * Business Card tile — federated `business_card` remote widget. Faithful port of
 * the host's IdentityCardWidget: the signed-in user's digital business card with
 * a scannable vCard QR; tapping opens the profile sheet.
 *
 * Cross-bundle bits come from @myek/platform (host-published): the logged-in
 * user (name/email/photo) and the open-profile action. Org/title/phone come via
 * props (BusinessCardPayload). (The share chip is omitted in the remote.)
 */
export const IdentityCardWidget: React.FC<WidgetProps<BusinessCardPayload>> = ({ data }) => {
  const theme = useTheme();
  if (!data) return null;
  return (
    <View style={{ flex: 1, marginHorizontal: -16, marginTop: -16, marginBottom: -16 }}>
      <Pressable onPress={() => openProfile()} style={{ flex: 1 }} accessibilityLabel="Open profile">
        <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, overflow: 'hidden' }}>
          <FrontFace data={data} />
        </View>
      </Pressable>
    </View>
  );
};

const FrontFace: React.FC<{ data: BusinessCardPayload }> = ({ data }) => {
  const theme = useTheme();
  const user = getPlatformUser();
  const fullName =
    user && (user.firstName || user.lastName) ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : data.fullName;
  const email = user?.email || data.email;
  const vCard = useMemo(
    () => buildVCard({ fullName, organization: data.organization, jobTitle: data.jobTitle, phone: data.phone, email }),
    [fullName, data.organization, data.jobTitle, data.phone, email],
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 3, backgroundColor: theme.colors.ekRed }} />
      <View style={{ padding: 18, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar size={48} name={fullName} photoUri={user?.photoUri} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: widgetTheme.fontSize.titleSm, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }} numberOfLines={1}>
              {data.jobTitle}
            </Text>
            <Text style={{ fontSize: widgetTheme.fontSize.caption, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ekRedDark, letterSpacing: 0.6, marginTop: 2 }} numberOfLines={1}>
              {data.organization.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line, marginVertical: 5 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="mail" size={12} color={theme.colors.ekRedDark} />
              <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.inkSecondary }} numberOfLines={1}>{email}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="phone" size={12} color={theme.colors.ekRedDark} />
              <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.inkSecondary }} numberOfLines={1}>{data.phone}</Text>
            </View>
          </View>
          <View style={{ padding: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
            <QRCode value={vCard} size={76} color={theme.colors.ink} backgroundColor={theme.colors.surface} />
          </View>
        </View>
      </View>
    </View>
  );
};

const Avatar: React.FC<{ size: number; name: string; photoUri?: string }> = ({ size, name, photoUri }) => {
  const theme = useTheme();
  const radius = size / 2;
  const ring = {
    shadowColor: theme.colors.ekRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 4,
  };
  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={[{ width: size, height: size, borderRadius: radius }, ring]} />;
  }
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: theme.colors.ekRed, alignItems: 'center', justifyContent: 'center' }, ring]}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials(name)}</Text>
    </View>
  );
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
