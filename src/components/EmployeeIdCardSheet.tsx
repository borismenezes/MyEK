import React, { useCallback, useEffect, useState, type ComponentProps } from 'react';
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
import type { PlatinumCardPayload, UserEligibility } from '@/types';

/**
 * Fallback access pills shown when the signed-in user object doesn't
 * carry an `eligibilities` array (e.g. cached from before the field was
 * added). Keeps the ID card useful even on stale auth data.
 */
const FALLBACK_ELIGIBILITIES: UserEligibility[] = [
  { label: 'Eligible to access phone at DXB Airport', tone: 'gold' },
  { label: 'Premium lounge access', tone: 'gold' },
];
import Barcode from 'react-native-barcode-svg';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Wider than before — only ~16px breathing room on each side. Height is
// driven from width so the front/back faces match perfectly for the flip.
const CARD_HORIZONTAL_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
// Portrait — sized to JUST hold the front-face content (photo + info rows
// + barcode). Lower than before so the Access & Privileges section below
// the card lands within the viewport without scrolling.
const CARD_ASPECT = 1.4;
const CARD_HEIGHT = Math.round(CARD_WIDTH * CARD_ASPECT);

// Scannable-barcode palette. Bars must be dark and the panel light for a
// scanner to read the code (correct polarity + contrast). A warm champagne
// panel keeps the premium gold feel of the card while staying high-contrast.
const BARCODE_PANEL = '#F3E9D2';
const BARCODE_BARS = '#1A1206';

interface EmployeeIdCardSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet overlay that reveals the user's Employee ID card.
 *
 * Triggered by tapping a profile photo (HomeScreen, ProfileScreen). The
 * sheet animates from the bottom with a spring; the card itself flips
 * 3-D-style on tap to reveal the Platinum card on the back — same
 * pattern as the Business Card widget on the home screen, sized for
 * portrait so it fits behind the ID front.
 *
 * Visual language matches the Business Card widget: white surface with
 * a red accent stripe on the front, dark "Platinum" surface with gold
 * accents on the back.
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
  // shows the ID side first.
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
  // Always show pills — fall back to the bundled defaults so the section
  // never disappears for users whose cached bootstrap predates the field.
  const eligibilities =
    user.eligibilities && user.eligibilities.length > 0
      ? user.eligibilities
      : FALLBACK_ELIGIBILITIES;

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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close ID card" />
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
              Employee ID
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              Tap card to flip · scan to verify
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
          {/* Flippable card. Both faces are absolutely positioned and sized
              the same so the rotateY transform looks correct from either
              side. backfaceVisibility hides whichever face is currently
              rotated 90°+ away from the viewer. */}
          <Pressable onPress={handleFlip} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Animated.View style={[styles.face, frontStyle]}>
              <FrontFace
                fullName={fullName}
                jobTitle={user.jobTitle}
                department={user.department}
                company={company}
                email={user.email}
                employeeId={user.employeeId}
                surface={theme.colors.surface}
                line={theme.colors.line}
                accent={theme.colors.ekRed}
                ink={theme.colors.ink}
                muted={theme.colors.muted}
                mutedStrong={theme.colors.mutedStrong}
              />
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

          <View style={[styles.eligibility, { backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: theme.colors.ink,
                  letterSpacing: 1.6,
                }}>
                ACCESS & PRIVILEGES
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: theme.colors.greenSoft,
                }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: theme.colors.green, letterSpacing: 0.8 }}>
                  VERIFIED
                </Text>
              </View>
            </View>
            {eligibilities.map((e, i) => (
              <EligibilityRow key={i} eligibility={e} divider={i < eligibilities.length - 1} />
            ))}
          </View>

          <Text style={{ fontSize: 10, color: theme.colors.muted, textAlign: 'center', marginTop: 14 }}>
            For internal use only · Property of Emirates Group
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────
 * Front face — light surface, red accent stripe, identity rows.
 * ───────────────────────────────────────────────────────── */

interface FrontFaceProps {
  fullName: string;
  jobTitle: string;
  department: string;
  company: string;
  email: string;
  employeeId: string;
  surface: string;
  line: string;
  accent: string;
  ink: string;
  muted: string;
  mutedStrong: string;
}

/**
 * Single eligibility row inside Access & Privileges. Designed for security
 * scanning at speed — a filled coloured chip on the left (with a check or
 * star), bold high-contrast label, hairline divider between rows.
 */
const EligibilityRow: React.FC<{ eligibility: UserEligibility; divider: boolean }> = ({
  eligibility,
  divider,
}) => {
  const theme = useTheme();
  const tone = eligibility.tone ?? 'gold';
  // Map the tone keyword to a saturated badge colour. `gold` reads as
  // "premium/awarded" (gate access, lounge); `green` reads as
  // "approved/granted" (travel benefits, regular clearances).
  const accent =
    tone === 'green' ? theme.colors.green
    : tone === 'red' ? theme.colors.ekRed
    : theme.colors.ekGold;
  const icon: ComponentProps<typeof Icon>['name'] = tone === 'gold' ? 'star' : 'check';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: theme.colors.line,
      }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accent,
        }}>
        <Icon name={icon} size={15} color="white" stroke={2.6} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '700',
          color: theme.colors.ink,
          letterSpacing: -0.1,
        }}>
        {eligibility.label}
      </Text>
    </View>
  );
};

const FrontFace: React.FC<FrontFaceProps> = ({
  fullName,
  jobTitle,
  department,
  company,
  email,
  employeeId,
  surface,
  line,
  accent,
  ink,
  muted,
  mutedStrong,
}) => (
  <View style={[styles.cardBody, { backgroundColor: surface }]}>
    <View style={[styles.accentStripe, { backgroundColor: accent }]} />

    <Text
      style={{
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 2.4,
        color: accent,
        textAlign: 'center',
        marginTop: 12,
      }}>
      EMIRATES GROUP · STAFF
    </Text>

    <View style={{ alignItems: 'center', marginTop: 14 }}>
      <View
        style={{
          borderWidth: 3,
          borderColor: surface,
          borderRadius: 999,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}>
        <Avatar size={104} />
      </View>
    </View>

    <Text
      style={{
        fontSize: 19,
        fontWeight: '800',
        color: ink,
        textAlign: 'center',
        letterSpacing: -0.3,
        marginTop: 12,
      }}
      numberOfLines={1}>
      {fullName || '—'}
    </Text>
    <Text
      style={{
        fontSize: 12,
        fontWeight: '500',
        color: muted,
        textAlign: 'center',
        marginTop: 2,
        paddingHorizontal: 16,
      }}
      numberOfLines={2}>
      {jobTitle}
    </Text>

    <View style={[styles.divider, { backgroundColor: line }]} />

    <View style={{ paddingHorizontal: 24, gap: 10 }}>
      <InfoRow label="Department" value={department} mutedStrong={mutedStrong} ink={ink} />
      <InfoRow label="Company" value={company} mutedStrong={mutedStrong} ink={ink} />
      <InfoRow label="Email" value={email} mutedStrong={mutedStrong} ink={ink} />
      <InfoRow label="Staff ID" value={employeeId} mono mutedStrong={mutedStrong} ink={ink} />
    </View>

    <View style={[styles.divider, { backgroundColor: line }]} />

    {/* Barcode sits flush under the divider (no `marginTop: 'auto'`) so
        the card height tracks the content tightly — eliminates the dead
        white band that pushed Access & Privileges off-screen. */}
    <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 14 }}>
      {/* Real, scannable CODE128 of the staff ID on a champagne quiet-zone
          panel (dark bars on light — the only polarity standard scanners
          read), matched to the front-face barcode strip. */}
      <View style={{ backgroundColor: BARCODE_PANEL, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
        <Barcode
          value={`EK-${employeeId}`}
          format="CODE128"
          maxWidth={Math.min(CARD_WIDTH - 96, 240)}
          singleBarWidth={2}
          height={48}
          lineColor={BARCODE_BARS}
          backgroundColor={BARCODE_PANEL}
        />
      </View>
    </View>
  </View>
);

const InfoRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  mutedStrong: string;
  ink: string;
}> = ({ label, value, mono, mutedStrong, ink }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
    <Text
      style={{
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: mutedStrong,
        width: 84,
        marginTop: 2,
      }}>
      {label.toUpperCase()}
    </Text>
    <Text
      style={{
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: ink,
        ...(mono ? { fontVariant: ['tabular-nums' as const], letterSpacing: 0.5 } : {}),
      }}
      numberOfLines={2}>
      {value || '—'}
    </Text>
  </View>
);

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
  // Outer View has no padding so the red accent stripe can sit flush
  // against the top edge — matching the front face. All content padding
  // moves to the inner wrapper.
  return (
    <View style={[styles.cardBody, { backgroundColor: '#0a0a0a' }]}>
      <View style={[styles.accentStripe, { backgroundColor: accent }]} />
      {/* Outer row: content column on the left, vertical barcode strip on
          the right. The barcode's rotation is applied to an inner view
          sized horizontally — RN transforms don't reshape layout, so the
          outer column reserves the rotated dimensions and the inner is
          centered into them. */}
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
          {/* Top: tier label + corner bracket */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>
              {data?.tierLabel ?? 'EK · PLATINUM'}
            </Text>
            <CornerBracket label={data?.tierBadge ?? 'EXECUTIVE TIER'} color={gold} />
          </View>

          {/* Middle: profile photo + name + role + org. */}
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
                  <Text
                    style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12 }}
                    numberOfLines={1}>
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

          {/* Bottom: member id + dates */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: goldMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>
              MEMBER ID
            </Text>
            <Text
              style={{
                color: gold,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: 0.6,
                marginTop: 2,
              }}>
              {data?.memberId ?? '— · —'}
            </Text>
            {data ? (
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 4 }}>
                SINCE {data.memberSince}  ·  THRU {data.validThru}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Vertical barcode column. Width is the rotated bar height; the
            inner view holds the barcode in its native horizontal layout
            and is rotated -90deg so it visually fills the column. */}
        {data ? (
          <View style={{
            width: 64,
            paddingVertical: 28,
            paddingRight: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
              {/* Dark bars on a warm champagne quiet-zone panel. Barcode
                  scanners need correct polarity (dark on light) and a light
                  margin; the previous gold-on-black render was a real CODE128
                  but couldn't be read. The champagne strip keeps the premium
                  gold feel while staying high-contrast and scannable. */}
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
// ASCII-only, so strip the bullet/whitespace before encoding so a scan
// returns a clean token ("6245-79PLT"). The human-readable label above
// the barcode still shows the formatted version.
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
  // The flipping faces. Both share these so they line up perfectly under
  // the rotateY transform. backfaceVisibility hides each face when rotated
  // beyond 90° from the viewer.
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
    marginVertical: 14,
    marginHorizontal: 22,
  },
  eligibility: {
    marginTop: 18,
    width: CARD_WIDTH,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
