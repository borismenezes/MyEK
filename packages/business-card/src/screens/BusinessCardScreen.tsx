import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Icon, useTheme } from '@myek/ui';
import { buildVCard, getPlatformUser } from '@myek/platform';

/**
 * Federated business-card FRONT — the `business_card` remote's `./screens`
 * expose. The host's card sheet mounts this as the front face of its flip
 * (the flip + Platinum back + bottom-sheet chrome stay in the host), so the
 * card's design ships over the air with no host rebuild.
 *
 * Reads the signed-in identity from @myek/platform (host-published) and the
 * shared design tokens from @myek/ui. Layout mirrors the home business-card
 * widget, scaled for the portrait sheet, with the vCard QR placed BELOW the
 * contact rows (full-width, centered) rather than inline.
 */
export default function BusinessCardScreen(): React.ReactElement {
  const theme = useTheme();
  const user = getPlatformUser();
  const fullName =
    user && (user.firstName || user.lastName)
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : '—';
  const jobTitle = user?.jobTitle ?? '';
  const organization = user?.organization ?? 'Emirates Group';
  const email = user?.email ?? '';
  const vCard = buildVCard({ fullName, organization, jobTitle, phone: '', email });

  return (
    <View style={[styles.body, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.stripe, { backgroundColor: theme.colors.ekRed }]} />

      <View style={{ padding: 22, flex: 1 }}>
        {/* Identity header — avatar left, name / title / org right. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar size={72} name={fullName} photoUri={user?.photoUri} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.ink, letterSpacing: -0.3 }} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.colors.muted, marginTop: 3 }} numberOfLines={2}>
              {jobTitle}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.ekRedDark, letterSpacing: 0.8, marginTop: 5 }} numberOfLines={1}>
              {organization.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

        {/* Contact rows */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="mail" size={16} color={theme.colors.ekRedDark} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.inkSecondary }} numberOfLines={1}>
              {email || '—'}
            </Text>
          </View>
        </View>

        {/* vCard QR — below the contact rows, centered. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 16 }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.line }}>
            <QRCode value={vCard} size={150} color={theme.colors.ink} backgroundColor={theme.colors.surface} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.muted, letterSpacing: 1.2, marginTop: 10 }}>
            SCAN TO ADD CONTACT
          </Text>
        </View>
      </View>
    </View>
  );
}

const Avatar: React.FC<{ size: number; name: string; photoUri?: string }> = ({ size, name, photoUri }) => {
  const theme = useTheme();
  const radius = size / 2;
  const ring = {
    shadowColor: theme.colors.ekRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  };
  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={[{ width: size, height: size, borderRadius: radius }, ring]} />;
  }
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: theme.colors.ekRed, alignItems: 'center', justifyContent: 'center' }, ring]}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>{initials(name)}</Text>
    </View>
  );
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  stripe: { height: 5, width: '100%' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
});
