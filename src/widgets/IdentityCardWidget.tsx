import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { captureRef } from 'react-native-view-shot';
import { Avatar, Icon } from '@components/index';
import { platinumService } from '@services/platinumService';
import { vCardService } from '@services/vCardService';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme, widgetTheme } from '@theme/index';
import type { BusinessCardPayload, PlatinumCardPayload, WidgetProps } from '@/types';

/**
 * Business Card widget. Tap to fetch the user's platinum card and flip the
 * tile over (rotateY 0→180); tap again to flip back. Platinum data is fetched
 * lazily on the first flip and reused thereafter.
 */
/**
 * IdentityCardWidget — generic, application-agnostic flippable identity card with QR tile.
 *
 * Originally named `BusinessCardWidget` (renamed to a reusable name as part of
 * the widget refactor). Visual + data-shape behaviour is unchanged for
 * now; the planned next step is to accept an `appName` prop and route
 * data fetching through a generic per-application service so the same
 * component can serve multiple business apps.
 */
export const IdentityCardWidget: React.FC<WidgetProps<BusinessCardPayload>> = ({ data }) => {
  const theme = useTheme();
  const flipProgress = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);
  const [platinum, setPlatinum] = useState<PlatinumCardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  // Capture target wraps just the front-face content, *not* the share
  // button — so the rendered PNG is the clean card without the chip on
  // top.
  const cardShotRef = useRef<View>(null);

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(cardShotRef, { format: 'png', quality: 0.98 });
      await Share.share({ url: uri, title: 'Business Card', message: 'Business Card' });
    } catch {
      // User-cancelled or capture-failed — silent. The share sheet itself
      // already gives feedback.
    }
  }, []);

  const handlePress = useCallback(async () => {
    if (flipped) {
      setFlipped(false);
      flipProgress.value = withTiming(0, { duration: 500, easing: Easing.inOut(Easing.cubic) });
      return;
    }
    if (!platinum && !loading) {
      setLoading(true);
      try {
        const next = await platinumService.fetch();
        setPlatinum(next);
      } finally {
        setLoading(false);
      }
    }
    setFlipped(true);
    flipProgress.value = withTiming(1, { duration: 500, easing: Easing.inOut(Easing.cubic) });
  }, [flipped, platinum, loading, flipProgress]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  if (!data) return null;

  return (
    // Outer wrapper exists only so the share button can sit as a sibling
    // of the flip Pressable — nested Pressables on iOS fight over the
    // gesture responder and the outer one was winning, so taps on the
    // share chip kept triggering a flip. As a sibling on top, the chip
    // owns its own hit area and the flip Pressable never sees that touch.
    <View style={{ flex: 1, marginHorizontal: -16, marginTop: -16, marginBottom: -16 }}>
      <Pressable onPress={handlePress} style={{ flex: 1 }}>
        <Animated.View style={[styles.face, frontStyle]}>
          {/* `collapsable={false}` keeps the wrapper as a real native
              view on Android so captureRef has something to snapshot.
              Background + rounded corners are set here (not on the parent
              Card surface, which sits outside this ref) so the captured
              PNG renders with the white card surface instead of bleeding
              through to a black backdrop in the share sheet. */}
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
        </Animated.View>
        <Animated.View style={[styles.face, backStyle]}>
          <BackFace data={platinum} loading={loading} />
        </Animated.View>
      </Pressable>
      {/* Share chip overlays the front face but isn't a child of the
          flip Pressable, so its tap can't bubble there. It's also
          outside the cardShotRef wrapper, so it doesn't appear in the
          captured image. */}
      <ShareIconButton onPress={handleShare} />
    </View>
  );
};

// Small grey share chip pinned to the top-right of the front face. Inner
// Pressable swallows the tap so it doesn't bubble up to the outer flip
// handler.
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
  // Google Lens when scanned. Rebuilt only when the underlying card data
  // changes — the QR grid is expensive to re-render otherwise.
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
          {/* Rounded frame around the QR — react-native-qrcode-svg renders
              a square SVG, so we wrap it in a borderRadius+overflow:hidden
              View with a tiny padding so the finder squares aren't clipped
              at the rounded corners. Background matches the QR's own bg so
              the padding reads as part of the frame. */}
          <View
            style={{
              padding: 4,
              borderRadius: 10,
              overflow: 'hidden',
              backgroundColor: theme.colors.surface,
            }}>
            <QRCode value={vCard} size={56} color={theme.colors.ink} backgroundColor={theme.colors.surface} />
          </View>
        </View>
      </View>
    </View>
  );
};

const BackFace: React.FC<{ data: PlatinumCardPayload | null; loading: boolean }> = ({ data, loading }) => {
  const theme = useTheme();
  const gold = theme.colors.ekGold;
  const goldMuted = 'rgba(196, 158, 78, 0.7)';
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Red accent stripe — matches the front face and the EmployeeIdCard
          back face, so the brand red is consistent across every card
          surface in the app. */}
      <View style={{ height: 5, width: '100%', backgroundColor: theme.colors.ekRedDark }} />
      {/* Outer row: content column on the left, vertical barcode strip on
          the right. Barcode rotation is applied to an inner view sized as
          if it were horizontal — RN's transforms don't reshape layout, so
          we reserve a vertical slot on the outer column and rotate the
          inner barcode into it. */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: gold, fontSize: widgetTheme.fontSize.caption, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: 1.4 }}>
              {data?.tierLabel ?? 'EK · PLATINUM'}
            </Text>
            <CornerBracket label={data?.tierBadge ?? 'EXECUTIVE TIER'} color={gold} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: 'white', fontSize: widgetTheme.fontSize.titleSm, fontWeight: widgetTheme.fontWeight.bold }} numberOfLines={1}>
                {data?.fullName ?? (loading ? 'Loading…' : '—')}
              </Text>
              {data ? (
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: widgetTheme.fontSize.label }} numberOfLines={1}>
                  {data.jobTitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: goldMuted }} />

          <View>
            <Text style={{ color: goldMuted, fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, letterSpacing: 1.2 }}>MEMBER ID</Text>
            <Text style={{ color: gold, fontSize: widgetTheme.fontSize.value, fontWeight: widgetTheme.fontWeight.heavy, letterSpacing: 0.6, marginTop: 1 }}>
              {data?.memberId ?? '— · —'}
            </Text>
            {data ? (
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: widgetTheme.fontSize.micro, marginTop: 4 }}>
                SINCE {data.memberSince}  ·  THRU {data.validThru}
              </Text>
            ) : null}
          </View>
        </View>

        {data ? (
          <View style={{
            width: 38,
            paddingVertical: 12,
            paddingRight: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
              <Barcode
                value={memberIdForBarcode(data.memberId)}
                format="CODE128"
                maxWidth={120}
                singleBarWidth={1.2}
                height={26}
                lineColor={gold}
                backgroundColor="#0a0a0a"
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// Member IDs are formatted for display (e.g. "6245 · 79PLT"). CODE128 is
// ASCII-only, so strip the bullet/whitespace before encoding so a scan
// returns a clean token ("6245-79PLT"). The human-readable label above
// the barcode still shows the formatted version.
function memberIdForBarcode(memberId: string): string {
  return memberId.replace(/\s+/g, '').replace(/·/g, '-');
}

const CornerBracket: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={{ color, fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, letterSpacing: 1.4, marginRight: 4 }}>{label}</Text>
    <View style={{ width: 10, height: 10, borderTopWidth: 1, borderRightWidth: 1, borderColor: color }} />
  </View>
);

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
});
