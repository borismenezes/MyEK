import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
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
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';
import QRCode from 'react-native-qrcode-svg';
import { vCardService } from '@services/vCardService';
import { config as appConfig } from '@config/index';
import { useCatalogStore } from '@store/useCatalogStore';
import { FederatedRemote } from '@services/federation/FederatedRemote';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CARD_HORIZONTAL_PADDING = 28;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
// Portrait — holds the business-card front (photo + identity + contact + QR).
// Compact popup (~70% of the old footprint): narrower via the wider side padding
// above, and a shorter aspect here.
const CARD_ASPECT = 1.3;
const CARD_HEIGHT = Math.round(CARD_WIDTH * CARD_ASPECT);

interface EmployeeBusinessCardProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet overlay that reveals the user's digital **Business Card** — the
 * same card shown on the home grid (avatar, identity, contact) with the
 * scannable vCard QR below the contact rows.
 *
 * The card FRONT is served by the federated `business_card` remote (so its
 * design ships OTA); this host component owns the bottom-sheet chrome and falls
 * back to an in-host front face when the remote isn't available.
 */
export const EmployeeBusinessCard: React.FC<EmployeeBusinessCardProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  // Federated business-card front (catalog mapping). MUST be called
  // unconditionally — before the early returns below — per the Rules of Hooks.
  const bcService = useCatalogStore(s => s.widgetToService.businessCard);

  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

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

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [SCREEN_HEIGHT, 0], Extrapolation.CLAMP) },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  if (!mounted && !visible) return null;
  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const company = 'Emirates Group';
  // Federate the card front when the catalog maps the business-card remote —
  // its design then ships OTA. Falls back to the in-host FrontFace otherwise.
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
          </View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.line,
              opacity: pressed ? 0.6 : 1,
            })}>
            <Icon name="close" size={18} color={theme.colors.mutedStrong} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: CARD_HORIZONTAL_PADDING, paddingBottom: 32, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
            {federateCard ? (
              <FederatedRemote service={bcService!} />
            ) : (
              <FrontFace
                fullName={fullName}
                jobTitle={user.jobTitle}
                organization={company}
                email={user.email}
                phone={user.phone}
                staffId={user.staffId}
                surface={theme.colors.surface}
                line={theme.colors.line}
                accent={theme.colors.ekRed}
                ink={theme.colors.ink}
                muted={theme.colors.muted}
                ekRedDark={theme.colors.ekRedDark}
                inkSecondary={theme.colors.inkSecondary}
              />
            )}
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────
 * In-host front face — the fallback business card (used when the federated
 * remote isn't available). Light surface, red accent stripe, avatar +
 * identity, contact rows, and the scannable vCard QR below.
 * ───────────────────────────────────────────────────────── */

interface FrontFaceProps {
  fullName: string;
  jobTitle: string;
  organization: string;
  email: string;
  phone?: string;
  staffId?: string;
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
  staffId,
  surface,
  line,
  accent,
  ink,
  muted,
  ekRedDark,
  inkSecondary,
}) => {
  const vCard = vCardService.build({ fullName, organization, jobTitle, phone: phone ?? '', email });
  // Staff number (Graph /me) with an "S" prefix. Empty when /me hasn't provided it.
  const staffIdLabel = staffId && !/^s/i.test(staffId) ? `S${staffId}` : staffId ?? '';
  return (
    <View style={[styles.cardBody, { backgroundColor: surface }]}>
      <View style={[styles.accentStripe, { backgroundColor: accent }]} />

      <View style={{ padding: 22, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar size={72} ring />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 25, fontWeight: '800', color: ink, letterSpacing: -0.3 }} numberOfLines={1}>
              {fullName || '—'}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: muted, marginTop: 3 }} numberOfLines={2}>
              {jobTitle}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: ekRedDark, letterSpacing: 0.8, marginTop: 5 }} numberOfLines={1}>
              {organization.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: line }]} />

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="mail" size={16} color={ekRedDark} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: inkSecondary }} numberOfLines={1}>
              {email || '—'}
            </Text>
          </View>
          {phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="phone" size={16} color={ekRedDark} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: inkSecondary }} numberOfLines={1}>
                {phone}
              </Text>
            </View>
          ) : null}
          {staffIdLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: ekRedDark, letterSpacing: 0.3 }}>ID</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: inkSecondary }} numberOfLines={1}>
                {staffIdLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 16 }}>
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 14,
              padding: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: line,
            }}>
            <QRCode value={vCard} size={200} color={ink} backgroundColor={surface} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: muted, letterSpacing: 1.2, marginTop: 10 }}>
            SCAN TO ADD CONTACT
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardBody: {
    flex: 1,
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
