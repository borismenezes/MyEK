import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { platinumService } from '@services/platinumService';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';
import type { PlatinumCardPayload } from '@/types';
import Barcode from 'react-native-barcode-svg';
import QRCode from 'react-native-qrcode-svg';
import { vCardService } from '@services/vCardService';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { config as appConfig } from '@config/index';
import { useCatalogStore } from '@store/useCatalogStore';
import { FederatedRemote } from '@services/federation/FederatedRemote';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Wider than before — only ~16px breathing room on each side. Height is
// driven from width so the front/back faces match perfectly for the flip.
const CARD_HORIZONTAL_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
// Portrait — sized to hold the business-card front (photo + identity + contact
// rows + the vCard QR below). Kept tall so the Platinum back has room too.
const CARD_ASPECT = 1.5;
const CARD_HEIGHT = Math.round(CARD_WIDTH * CARD_ASPECT);

// Scannable-barcode palette (Platinum back). Bars dark, panel light so a
// scanner reads it (correct polarity + contrast); champagne keeps the gold feel.
const BARCODE_PANEL = '#F3E9D2';
const BARCODE_BARS = '#1A1206';

interface EmployeeIdCardSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet overlay that reveals the user's digital **Business Card**.
 *
 * Triggered by tapping the Business Card widget / profile photo. The front is
 * the same business card shown on the home grid (avatar, identity, contact)
 * with the scannable vCard QR placed below the contact rows; tapping the card
 * flips it to reveal the Emirates Platinum card on the back.
 */
export const EmployeeIdCardSheet: React.FC<EmployeeIdCardSheetProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);

  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  // Card flip — mirror the BusinessCardWidget pattern.
  const flipProgress = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);
  const [platinum, setPlatinum] = useState<PlatinumCardPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, { damping: 22, stiffness: 180, mass: 0.9 });
    } else {
      progress.value = withTiming(0, { duration: 240 }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  // Reset to the front whenever the sheet closes — opening fresh always
  // shows the business-card side first.
  useEffect(() => {
    if (!visible) {
      flipProgress.value = withTiming(0, { duration: 0 });
      setFlipped(false);
    }
  }, [visible, flipProgress]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [SCREEN_HEIGHT, 0], Extrapolation.CLAMP) },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const handleFlip = useCallback(async () => {
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
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  if (!mounted && !visible) return null;
  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const company = 'Emirates Group';
  // Federate the card front when the catalog maps the business-card remote —
  // its design then ships OTA. Falls back to the in-host FrontFace otherwise.
  const bcService = useCatalogStore(s => s.widgetToService.businessCard);
  const federateCard = appConfig.mf.enabled && !!bcService;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]} pointerEvents="none">
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'dark' ? 'dark' : 'light'}
          blurAmount={18}
          reducedTransparencyFallbackColor={theme.colors.bg}
        />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close business card" />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: insets.top + 24,
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: insets.bottom + 12,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: -4 },
            shadowRadius: 16,
            elevation: 12,
          },
          sheetStyle,
        ]}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.line }} />
        </View>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.4 }}>
              Business Card
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              Tap card to flip · scan the QR to save contact
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.ekRed,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: CARD_HORIZONTAL_PADDING, paddingBottom: 32, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}>
          {/* Flippable card — business card front, Platinum back. */}
          <Pressable onPress={handleFlip} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Animated.View style={[styles.face, frontStyle]}>
              {federateCard ? (
                <FederatedRemote service={bcService!} />
              ) : (
                <FrontFace
                  fullName={fullName}
                  jobTitle={user.jobTitle}
                  organization={company}
                  email={user.email}
                  phone={undefined}
                  surface={theme.colors.surface}
                  line={theme.colors.line}
                  accent={theme.colors.ekRed}
                  ink={theme.colors.ink}
                  muted={theme.colors.muted}
                  ekRedDark={theme.colors.ekRedDark}
                  inkSecondary={theme.colors.inkSecondary}
                />
              )}
            </Animated.View>
            <Animated.View style={[styles.face, backStyle]}>
              <PortraitPlatinumBack
                data={platinum}
                loading={loading}
                gold={theme.colors.ekGold}
                accent={theme.colors.ekRed}
              />
            </Animated.View>
          </Pressable>

          <Text style={{ fontSize: 10, color: theme.colors.muted, textAlign: 'center', marginTop: 16 }}>
            For internal use only · Property of Emirates Group
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────
 * Front face — the digital business card. Light surface, red accent
 * stripe, avatar + identity, contact rows, and the scannable vCard QR
 * placed BELOW the contact rows (full-width, centered).
 * ───────────────────────────────────────────────────────── */

interface FrontFaceProps {
  fullName: string;
  jobTitle: string;
  organization: string;
  email: string;
  phone?: string;
  surface: string;
  line: string;
  accent: string;
  ink: string;
  muted: string;
  ekRedDark: string;
  inkSecondary: string;
}

const FrontFace: React.FC<FrontFaceProps> = ({
  fullName,
  jobTitle,
  organization,
  email,
  phone,
  surface,
  line,
  accent,
  ink,
  muted,
  ekRedDark,
  inkSecondary,
}) => {
  // vCard so scanning the QR triggers "Add to Contacts".
  const vCard = vCardService.build({ fullName, organization, jobTitle, phone: phone ?? '', email });
  return (
    <View style={[styles.cardBody, { backgroundColor: surface }]}>
      <View style={[styles.accentStripe, { backgroundColor: accent }]} />

      <View style={{ padding: 22, flex: 1 }}>
        {/* Identity header — avatar left, name / title / org right. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar size={72} ring />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontSize: 22, fontWeight: '800', color: ink, letterSpacing: -0.3 }}
              numberOfLines={1}>
              {fullName || '—'}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: muted, marginTop: 3 }} numberOfLines={2}>
              {jobTitle}
            </Text>
            <Text
              style={{ fontSize: 11, fontWeight: '800', color: ekRedDark, letterSpacing: 0.8, marginTop: 5 }}
              numberOfLines={1}>
              {organization.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: line }]} />

        {/* Contact rows */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="mail" size={16} color={ekRedDark} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: inkSecondary }} numberOfLines={1}>
              {email || '—'}
            </Text>
          </View>
          {phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="phone" size={16} color={ekRedDark} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: inkSecondary }} numberOfLines={1}>
                {phone}
              </Text>
            </View>
          ) : null}
        </View>

        {/* vCard QR — below the contact rows, centered and full-width. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 16 }}>
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 14,
              padding: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: line,
            }}>
            <QRCode value={vCard} size={150} color={ink} backgroundColor={surface} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: muted, letterSpacing: 1.2, marginTop: 10 }}>
            SCAN TO ADD CONTACT
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────
 * Portrait platinum back — dark surface, gold accents.
 * Mirrors BusinessCardWidget's BackFace adapted for portrait.
 * ───────────────────────────────────────────────────────── */

const PortraitPlatinumBack: React.FC<{
  data: PlatinumCardPayload | null;
  loading: boolean;
  gold: string;
  accent: string;
}> = ({ data, loading, gold, accent }) => {
  const goldMuted = 'rgba(196, 158, 78, 0.7)';
  return (
    <View style={[styles.cardBody, { backgroundColor: '#0a0a0a' }]}>
      <View style={[styles.accentStripe, { backgroundColor: accent }]} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View
          style={{
            flex: 1,
            paddingTop: 22,
            paddingLeft: 22,
            paddingRight: 12,
            paddingBottom: 24,
            justifyContent: 'space-between',
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>
              {data?.tierLabel ?? 'EK · PLATINUM'}
            </Text>
            <CornerBracket label={data?.tierBadge ?? 'EXECUTIVE TIER'} color={gold} />
          </View>

          <View style={{ alignItems: 'center', gap: 12 }}>
            <Avatar size={96} />
            <View style={{ alignItems: 'center', gap: 3, paddingHorizontal: 8 }}>
              <Text
                style={{ color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}
                numberOfLines={1}>
                {data?.fullName ?? (loading ? 'Loading…' : '—')}
              </Text>
              {data ? (
                <>
                  <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12 }} numberOfLines={1}>
                    {data.jobTitle}
                  </Text>
                  <Text
                    style={{ color: gold, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginTop: 2 }}
                    numberOfLines={1}>
                    {data.organization.toUpperCase()} · {data.department}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', height: StyleSheet.hairlineWidth, backgroundColor: goldMuted }} />

          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: goldMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>
              MEMBER ID
            </Text>
            <Text style={{ color: gold, fontSize: 18, fontWeight: '800', letterSpacing: 0.6, marginTop: 2 }}>
              {data?.memberId ?? '— · —'}
            </Text>
            {data ? (
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 4 }}>
                SINCE {data.memberSince}  ·  THRU {data.validThru}
              </Text>
            ) : null}
          </View>
        </View>

        {data ? (
          <View style={{ width: 64, paddingVertical: 28, paddingRight: 14, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
              <View style={{ backgroundColor: BARCODE_PANEL, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Barcode
                  value={memberIdForBarcode(data.memberId)}
                  format="CODE128"
                  maxWidth={Math.min(CARD_HEIGHT - 120, 320)}
                  singleBarWidth={2}
                  height={40}
                  lineColor={BARCODE_BARS}
                  backgroundColor={BARCODE_PANEL}
                />
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// Member IDs are formatted for display (e.g. "6245 · 79PLT"). CODE128 is
// ASCII-only, so strip the bullet/whitespace before encoding.
function memberIdForBarcode(memberId: string): string {
  return memberId.replace(/\s+/g, '').replace(/·/g, '-');
}

const CornerBracket: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={{ color, fontSize: 9, fontWeight: '700', letterSpacing: 1.4, marginRight: 4 }}>
      {label}
    </Text>
    <View style={{ width: 10, height: 10, borderTopWidth: 1, borderRightWidth: 1, borderColor: color }} />
  </View>
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardBody: {
    flex: 1,
    paddingBottom: 0,
  },
  accentStripe: {
    height: 5,
    width: '100%',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
});
