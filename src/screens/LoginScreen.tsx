import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Logo } from '@components/index';
import { signIn } from '@auth/index';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';
import { createLogger } from '@utils/logger';
import type { ComponentProps } from 'react';

const log = createLogger('Screen/Login');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type IconName = ComponentProps<typeof Icon>['name'];

/**
 * Profession-themed icons for the login banner. Picked to mirror the
 * applications the portal exposes — leave, attendance, flights, trainings,
 * calendar, notifications, perks — plus generic office/identity glyphs so
 * the banner reads as "employee tools" at a glance.
 */
const PROFESSION_ICONS: readonly IconName[] = [
  // Flights / travel
  'plane',
  'plane-flat',
  'passport',
  'globe',
  // Calendar / leave / scheduling
  'calendar',
  'briefcase',
  // Attendance / time
  'clock',
  'check',
  'timesheet',
  // Trainings / recognition
  'medal',
  'star',
  'sparkles',
  'doc',
  // Notifications / comms
  'bell',
  'mail',
  'phone',
  // HR / identity / workplace
  'user',
  'card',
  'building',
  'home',
  // Perks / extras
  'gift',
  'wallet',
  'meeting',
  'help',
];

/**
 * Login screen. The actual SSO ceremony is delegated to the IntuneAdapter;
 * this screen just shows a button + loading + error states.
 *
 * Visual: the top 60% of the screen runs a triple-row marquee of profession
 * icons in the app's grey line colour. Three rows drift left at slightly
 * different speeds (90 / 110 / 130 seconds per cycle) so the motion reads
 * as ambient depth rather than scrolling. The brand block + sign-in card
 * sit in the foreground, overlaying the lower half of the banner where
 * the soft fade dissolves into the page background.
 */
export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const setStatus = useAuthStore(s => s.setStatus);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<FriendlyErrorKey | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorKey(null);
    setErrorDetail(null);
    try {
      await signIn();
    } catch (e) {
      log.error('Sign-in failed', e);
      // Surface the raw MSAL/AADSTS detail so auth-config failures are
      // diagnosable on-device (the friendly card alone hides the cause).
      console.error('[signin] failed:', e);
      setErrorKey(classifyAuthError(e));
      setErrorDetail(rawErrorDetail(e));
      setStatus('unauthenticated');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      <ProfessionBanner />

      <View style={[styles.foreground, { paddingTop: insets.top }]}>
        <View style={styles.brand}>
          <View style={{ marginBottom: 8 }}>
            <Logo width={140} />
          </View>
          <Text style={{ fontSize: 14, color: theme.colors.muted, marginTop: 4 }}>Emirates Group · Employee Portal</Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            style={({ pressed }) => [
              styles.signInButton,
              { backgroundColor: theme.colors.ekRed, opacity: pressed || loading ? 0.85 : 1 },
            ]}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="user" size={18} color="white" />
                <Text style={styles.signInText}>Sign in with Microsoft</Text>
              </>
            )}
          </Pressable>
          {errorKey ? <ErrorCard kind={errorKey} /> : null}
          {errorDetail ? (
            <Text
              selectable
              style={{
                color: theme.colors.muted,
                fontSize: 11,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                marginTop: 10,
                textAlign: 'center',
              }}>
              {errorDetail}
            </Text>
          ) : null}
          <Text style={{ color: theme.colors.muted, fontSize: 11, textAlign: 'center', marginTop: 18 }}>
            By signing in you agree to the Emirates Group acceptable-use policy.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={{ color: theme.colors.muted, fontSize: 10 }}>MyEk · v4.2.1</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Top 60% of the screen. Three horizontal rows of profession icons drifting
 * left at decreasing speeds. Pinned to the top via absolute positioning so
 * the foreground content can overlay the lower portion where a soft fade
 * dissolves the banner into the page background.
 *
 * Colour is `theme.colors.line` — the lightest grey in the palette — so the
 * icons read as ambient texture rather than UI a user can interact with.
 */
const ProfessionBanner: React.FC = () => {
  const theme = useTheme();
  const bannerHeight = SCREEN_HEIGHT * 0.6;
  // Five rows, each with its own drift speed and offset. Long durations
  // (90s+) keep motion ambient — perceptible on a lingering glance, never
  // distracting. Mixing icon sizes per row gives the texture visual depth.
  const rows = useMemo(
    () => [
      { speedMs: 90_000, iconSize: 28, gap: 36, offset: 0 },
      { speedMs: 130_000, iconSize: 22, gap: 30, offset: 18 },
      { speedMs: 110_000, iconSize: 32, gap: 44, offset: -22 },
      { speedMs: 150_000, iconSize: 24, gap: 32, offset: 10 },
      { speedMs: 100_000, iconSize: 30, gap: 38, offset: -30 },
    ],
    [],
  );
  return (
    <View
      pointerEvents="none"
      style={[
        styles.banner,
        { height: bannerHeight, backgroundColor: theme.colors.bg },
      ]}>
      <View style={{ flex: 1, justifyContent: 'space-around', paddingVertical: 28 }}>
        {rows.map((row, i) => (
          <MarqueeRow
            key={i}
            speedMs={row.speedMs}
            iconSize={row.iconSize}
            gap={row.gap}
            offset={row.offset}
            color={theme.colors.line}
          />
        ))}
      </View>
      {/* Soft fade so the banner blends into the page background instead of
          ending on a hard horizontal seam. Sits on the lower 35% of the
          banner — just below where the brand block typically lands. */}
      <View
        style={[
          styles.bannerFade,
          { backgroundColor: theme.colors.bg, height: bannerHeight * 0.35 },
        ]}
      />
    </View>
  );
};

const MarqueeRow: React.FC<{
  speedMs: number;
  iconSize: number;
  gap: number;
  offset: number;
  color: string;
}> = ({ speedMs, iconSize, gap, offset, color }) => {
  const tx = useSharedValue(offset);

  // Width of one full sequence — width is computed from icon size + gap.
  // We render the sequence enough times to cover screen + one full sequence,
  // then translate from `offset` to `offset - sequenceWidth` and loop.
  const cellWidth = iconSize + gap;
  const sequenceWidth = cellWidth * PROFESSION_ICONS.length;

  useEffect(() => {
    tx.value = offset;
    tx.value = withRepeat(
      withTiming(offset - sequenceWidth, { duration: speedMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [tx, offset, sequenceWidth, speedMs]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const repeats = Math.ceil((SCREEN_WIDTH + sequenceWidth) / sequenceWidth) + 1;

  return (
    <View style={{ height: iconSize + 8, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row' }, animStyle]}>
        {Array.from({ length: repeats }).flatMap((_, repIdx) =>
          PROFESSION_ICONS.map((name, i) => (
            <View key={`${repIdx}-${i}`} style={{ width: cellWidth, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={name} size={iconSize} color={color} />
            </View>
          )),
        )}
      </Animated.View>
    </View>
  );
};

// ─── Friendly error mapping ────────────────────────────────────────────────
//
// MSAL surfaces internal codes like `MSALErrorDomain Code=-50005` which mean
// nothing to a user. We classify the exception into one of a handful of
// human-readable buckets and render a themed alert card.

type FriendlyErrorKey = 'cancelled' | 'network' | 'interaction' | 'denied' | 'generic';

interface FriendlyError {
  title: string;
  body: string;
  icon: IconName;
}

const FRIENDLY_ERRORS: Record<FriendlyErrorKey, FriendlyError> = {
  cancelled: {
    title: 'Sign-in cancelled',
    body: 'You closed the Microsoft sign-in before it finished. Tap Sign in to try again.',
    icon: 'close',
  },
  network: {
    title: 'Connection problem',
    body: "We couldn't reach the sign-in service. Check your internet connection and try again.",
    icon: 'wifi-off',
  },
  interaction: {
    title: 'Sign-in needed',
    body: 'Please complete the Microsoft sign-in prompt to continue.',
    icon: 'user',
  },
  denied: {
    title: 'Access denied',
    body: 'Your Emirates account isn\'t authorised to use MyEK yet. Contact IT support if this looks wrong.',
    icon: 'help',
  },
  generic: {
    title: "We couldn't sign you in",
    body: 'Something went wrong on our side. Please try again in a moment.',
    icon: 'help',
  },
};

function classifyAuthError(e: unknown): FriendlyErrorKey {
  const raw = e instanceof Error ? `${e.message}` : String(e);
  const m = raw.toLowerCase();
  // MSAL -50005 / "user cancelled" / "user closed" — most common in dev.
  if (m.includes('cancel') || m.includes('-50005') || m.includes('user closed')) return 'cancelled';
  // Network / connectivity issues.
  if (
    m.includes('network') ||
    m.includes('internet') ||
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('unreachable') ||
    m.includes('econn') ||
    m.includes('offline')
  ) {
    return 'network';
  }
  // MSAL interaction-required / consent prompts.
  if (m.includes('interaction') || m.includes('consent') || m.includes('-50001')) return 'interaction';
  // Authorisation / forbidden.
  if (m.includes('forbidden') || m.includes('unauthorized') || m.includes('not authorised') || m.includes('access denied') || m.includes('403')) {
    return 'denied';
  }
  return 'generic';
}

/**
 * Flattens the useful fields out of an MSAL/native error into a single short
 * string for on-device diagnosis (code · message · AADSTS · correlationId).
 */
function rawErrorDetail(e: unknown): string {
  if (e == null) return 'unknown error';
  if (typeof e === 'string') return e.slice(0, 600);
  const any = e as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of ['code', 'errorCode', 'subError', 'message', 'errorDescription', 'correlationId']) {
    const v = any[k];
    if (v != null && v !== '') parts.push(`${k}=${String(v)}`);
  }
  if (any.userInfo != null) {
    try { parts.push(`userInfo=${JSON.stringify(any.userInfo)}`); } catch { /* ignore */ }
  }
  const out = parts.length ? parts.join(' · ') : JSON.stringify(e);
  return out.slice(0, 600);
}

const ErrorCard: React.FC<{ kind: FriendlyErrorKey }> = ({ kind }) => {
  const theme = useTheme();
  const { title, body, icon } = FRIENDLY_ERRORS[kind];
  return (
    <View
      accessibilityRole="alert"
      style={{
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.line,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: 'rgba(198,12,48,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={18} color={theme.colors.ekRed} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2, lineHeight: 17 }}>{body}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  bannerFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.95,
  },
  foreground: { flex: 1 },
  brand: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 28,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  signInText: { color: 'white', fontWeight: '700', fontSize: 14 },
  footer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 18 },
});
