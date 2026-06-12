import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Dimensions, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { FederatedRemote } from '@services/federation/FederatedRemote';
import { useCatalogStore } from '@store/useCatalogStore';
import { useTheme } from '@theme/index';
import { config as appConfig } from '@config/index';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PayslipSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet CHROME for the payslip. The document itself — letterhead,
 * layout, data fetch — is the `payslip` remote's `./screens` expose
 * (packages/payslip/src/screens/PayslipDocumentScreen), mounted federated so
 * the payslip team ships document changes OTA with no host release. The host
 * owns only the presentation idioms: backdrop + spring sheet, the header
 * (title / share / close), and the share capture (`react-native-view-shot`
 * is a host-linked native module; capturing the wrapping View includes the
 * remote-rendered children — it's one native view tree).
 *
 * The sheet unmounts fully after the close animation, so each open freshly
 * mounts the remote and re-runs its `refetchOnMount: 'always'` query —
 * payslips are high-stakes, never served stale. Mirrors EmployeeBusinessCard's
 * host-chrome/remote-face split, but with no in-host fallback: the document
 * moved out entirely, and FederatedRemote's error boundary shows an explicit
 * retry state when the remote can't load (never a silent blank).
 */
export const PayslipSheet: React.FC<PayslipSheetProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const docRef = useRef<View>(null);
  // Resolve the owning service from the catalog (same lookup the home tile
  // uses). Subscribed so the sheet picks up a late-arriving catalog.
  const payslipService = useCatalogStore(s => s.widgetToService.payslip);

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

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(docRef, { format: 'png', quality: 0.98, result: 'tmpfile' });
      await Share.share({ url: uri, title: 'Payslip', message: 'Payslip' });
    } catch {
      // Cancelled or capture failed — silent. The share sheet itself gives
      // feedback on success / errors.
    }
  }, []);

  if (!mounted && !visible) return null;

  const federate = appConfig.mf.enabled && !!payslipService;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View
        style={[StyleSheet.absoluteFill, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close payslip" />
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
              Payslip
            </Text>
          </View>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share payslip"
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="share" size={16} color={theme.colors.ink} />
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close payslip"
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="close" size={16} color={theme.colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}>
          <View ref={docRef} collapsable={false} style={styles.paper}>
            {federate ? (
              // The sheet fully unmounts after the close animation (`mounted`
              // gate above), so every open is a fresh mount and the remote's
              // `refetchOnMount: 'always'` query re-runs — no key juggling.
              <FederatedRemote service={payslipService!} />
            ) : (
              // No catalog entry for the payslip service (offline first run /
              // federation disabled): say so explicitly — never a blank doc.
              <View style={{ alignItems: 'center', padding: 24, gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' }}>
                  Payslip unavailable
                </Text>
                <Text style={{ fontSize: 13, color: '#5b5b5b', textAlign: 'center' }}>
                  Check your connection and reopen this screen.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// Paper colours stay fixed (not theme tokens): the printable renders
// identically in light and dark mode, like a paper paystub.
const PAPER = { bg: '#FFFFFF', line: '#cfcfcf' };

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  paper: {
    backgroundColor: PAPER.bg,
    borderRadius: 6,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PAPER.line,
  },
});
