import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import { Avatar, Icon } from '@components/index';
import { vCardService } from '@services/vCardService';
import { useAuthStore } from '@store/useAuthStore';
import { useUIStore } from '@store/useUIStore';
import { useTheme, widgetTheme } from '@theme/index';
import type { BusinessCardPayload, WidgetProps } from '@/types';

/**
 * Business Card widget — the signed-in user's digital business card with a
 * scannable vCard QR. Tapping the card (or its QR) opens the full profile / ID
 * sheet — the same surface as the top-right profile avatar.
 *
 * (The earlier tap-to-flip-to-platinum gesture was removed: the card is now a
 * single, static front face whose tap target opens the profile.)
 */
export const IdentityCardWidget: React.FC<WidgetProps<BusinessCardPayload>> = ({ data }) => {
  const theme = useTheme();
  const openIdSheet = useUIStore(s => s.setIdSheetVisible);
  // Capture target wraps just the card content, not the share chip — so the
  // rendered PNG is the clean card.
  const cardShotRef = useRef<View>(null);

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(cardShotRef, { format: 'png', quality: 0.98 });
      await Share.share({ url: uri, title: 'Business Card', message: 'Business Card' });
    } catch {
      // User-cancelled or capture-failed — silent.
    }
  }, []);

  if (!data) return null;

  return (
    // Outer wrapper lets the share chip sit as a sibling of the tap Pressable
    // (nested Pressables fight over the gesture responder on iOS).
    <View style={{ flex: 1, marginHorizontal: -16, marginTop: -16, marginBottom: -16 }}>
      <Pressable onPress={() => openIdSheet(true)} style={{ flex: 1 }} accessibilityLabel="Open profile">
        <View
          ref={cardShotRef}
          collapsable={false}
          style={{
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.xl,
            overflow: 'hidden',
          }}>
          <FrontFace data={data} />
        </View>
      </Pressable>
      <ShareIconButton onPress={handleShare} />
    </View>
  );
};

// Small grey share chip pinned to the top-right. Its own Pressable swallows the
// tap so it doesn't bubble to the card's open-profile handler.
const ShareIconButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    hitSlop={8}
    accessibilityLabel="Share business card"
    style={({ pressed }) => ({
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.06)',
      opacity: pressed ? 0.65 : 1,
      zIndex: 5,
    })}>
    <Icon name="share" size={13} color="#6b6b70" stroke={2} />
  </Pressable>
);

const FrontFace: React.FC<{ data: BusinessCardPayload }> = ({ data }) => {
  const theme = useTheme();
  const user = useAuthStore(s => s.user);
  // The card belongs to the signed-in user — prefer the logged-in identity for
  // name/email over whatever the card payload (or its bundled default) carries.
  const fullName =
    user && (user.firstName || user.lastName) ? `${user.firstName} ${user.lastName}`.trim() : data.fullName;
  const email = user?.email || data.email;
  // vCard payload so the QR triggers "Add to Contacts" on iOS Camera /
  // Google Lens when scanned.
  const vCard = useMemo(
    () => vCardService.build({
      fullName,
      organization: data.organization,
      jobTitle: data.jobTitle,
      phone: data.phone,
      email,
    }),
    [fullName, data.organization, data.jobTitle, data.phone, email],
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 3, backgroundColor: theme.colors.ekRed }} />
      <View style={{ padding: 18, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar size={48} ring />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: widgetTheme.fontSize.titleSm, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }} numberOfLines={1}>
              {data.jobTitle}
            </Text>
            <Text
              style={{
                fontSize: widgetTheme.fontSize.caption,
                fontWeight: widgetTheme.fontWeight.bold,
                color: theme.colors.ekRedDark,
                letterSpacing: 0.6,
                marginTop: 2,
              }}
              numberOfLines={1}>
              {data.organization.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line, marginVertical: 5 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="mail" size={12} color={theme.colors.ekRedDark} />
              <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.inkSecondary }} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="phone" size={12} color={theme.colors.ekRedDark} />
              <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.inkSecondary }} numberOfLines={1}>
                {data.phone}
              </Text>
            </View>
          </View>
          {/* Rounded frame around the (enlarged) QR. */}
          <View
            style={{
              padding: 5,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: theme.colors.surface,
            }}>
            <QRCode value={vCard} size={76} color={theme.colors.ink} backgroundColor={theme.colors.surface} />
          </View>
        </View>
      </View>
    </View>
  );
};
