import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Icon, InfoSheet, InfoSheetSection } from '@components/index';
import { signOut } from '@auth/index';
import { useAuthStore } from '@store/useAuthStore';
import { useThemeStore } from '@store/useThemeStore';
import { useTheme } from '@theme/index';
import { widgetLayoutStorage } from '@widgets/index';
import type { ThemeMode } from '@/types';

type SupportIcon = 'help' | 'phone' | 'doc' | 'layers';

interface SupportRow {
  icon: SupportIcon;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

type InfoSheetKind = 'terms' | 'help' | 'hr' | null;

export const MoreScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [infoSheet, setInfoSheet] = useState<InfoSheetKind>(null);
  const themeMode = useThemeStore(s => s.mode);
  const setThemeMode = useThemeStore(s => s.setMode);
  const setLayout = useAuthStore(s => s.setWidgetLayout);

  const handleResetLayout = useCallback(() => {
    Alert.alert(
      'Reset widget layout',
      'This restores the default home-screen widgets and clears any add/remove/reorder you\'ve done. Cached widget data is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const fresh = widgetLayoutStorage.resetToDefault();
            setLayout(fresh);
          },
        },
      ],
    );
  }, [setLayout]);

  const rows: SupportRow[] = [
    { icon: 'help', title: 'Help Centre', subtitle: 'FAQs and guides', onPress: () => setInfoSheet('help') },
    { icon: 'phone', title: 'Contact HR', subtitle: 'Call or chat with HR team', onPress: () => setInfoSheet('hr') },
    { icon: 'doc', title: 'Terms & Privacy', subtitle: 'Terms of service and privacy policy', onPress: () => setInfoSheet('terms') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, paddingTop: insets.top + 8 },
        ]}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.5 }}>More</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <SectionHeader title="SUPPORT" />
          <Card padded={false}>
            {rows.map(r => (
              <SupportItem key={r.title} {...r} divider />
            ))}
            <ThemeRow mode={themeMode} onChange={setThemeMode} />
          </Card>

          <SectionHeader title="HOME SCREEN" />
          <Card padded={false}>
            <SupportItem
              icon="layers"
              title="Reset Widget Layout"
              subtitle="Restore the default widgets"
              onPress={handleResetLayout}
              divider={false}
            />
          </Card>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.signOut,
              { backgroundColor: theme.colors.surface, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Icon name="logout" size={16} color={theme.colors.ekRed} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ekRed }}>Sign Out</Text>
          </Pressable>

          <Text style={{ textAlign: 'center', fontSize: 12, color: theme.colors.muted, marginTop: 12 }}>
            MyEk · v4.2.1
          </Text>
        </View>
      </ScrollView>

      <InfoSheet
        visible={infoSheet === 'terms'}
        onClose={() => setInfoSheet(null)}
        title="Terms & Privacy"
        subtitle="Last updated · April 2026">
        <InfoSheetSection
          heading="1. Acceptable use"
          body="MyEK is provided to Emirates Group employees and authorised contractors for work-related purposes. You agree to use the app in line with the Emirates Group Code of Conduct and applicable local laws. Sharing your sign-in credentials, scraping data, or attempting to bypass access controls is strictly prohibited."
        />
        <InfoSheetSection
          heading="2. Data we collect"
          body="MyEK reads your employee profile, leave balances, payroll status, attendance, roster and similar HR data so it can present them to you. We also log device type, app version and basic crash telemetry to improve reliability. We do not sell personal data to any third party."
        />
        <InfoSheetSection
          heading="3. How your data is used"
          body="Your data is processed by Emirates Group internal systems to render the app's screens and personalise recommendations (e.g. eligibility tags, suggested trips). Aggregated, non-identifying metrics may be used to improve product features. Access to your profile is restricted to authorised HR, IT and audit personnel on a need-to-know basis."
        />
        <InfoSheetSection
          heading="4. Storage & retention"
          body="A cache of your most recent widget data is stored encrypted on your device so the app works briefly when offline. This cache is cleared automatically when you sign out, when your session expires, or when you uninstall MyEK. Server-side data is retained for the duration of your employment plus the period required by applicable law."
        />
        <InfoSheetSection
          heading="5. Sharing & third parties"
          body="MyEK uses Microsoft Entra ID for sign-in and Azure API Management as the gateway to internal HR services. We do not share your personal data with marketing partners or external analytics providers. Vendors processing data on our behalf are bound by data-protection agreements."
        />
        <InfoSheetSection
          heading="6. Your rights"
          body="You may request a copy of your personal data, ask for corrections, or raise a privacy concern at any time. Contact the HR Privacy Office or your local Data Protection Officer for assistance. Where local law provides additional rights (e.g. erasure or restriction), those rights apply."
        />
        <InfoSheetSection
          heading="7. Changes to these terms"
          body="We may update these terms from time to time. Material changes will be announced inside the app and on the corporate intranet. Continued use of MyEK after the effective date constitutes acceptance of the updated terms."
        />
        <InfoSheetSection
          heading="8. Contact"
          body="Questions about these terms? Reach out to ekgroup-it@emirates.com for technical issues, or privacy@emirates.com for data-protection enquiries."
        />
      </InfoSheet>

      <InfoSheet
        visible={infoSheet === 'hr'}
        onClose={() => setInfoSheet(null)}
        title="Contact HR"
        subtitle="Reach the right team faster">
        <InfoSheetSection
          heading="HR Service Desk"
          body="For day-to-day HR queries — leave, attendance, joining formalities, ID badge, certificates. Phone: +971 4 123 4567 · Email: hrservices@emirates.com · Hours: Sun–Thu 08:00–18:00 GST."
        />
        <InfoSheetSection
          heading="Payroll"
          body="Questions about your payslip, allowances, tax letters, or end-of-service settlements. Phone: +971 4 123 4567 ext. 2 · Email: payroll@emirates.com · Hours: Sun–Thu 09:00–17:00 GST."
        />
        <InfoSheetSection
          heading="Benefits & Wellbeing"
          body="Medical insurance, family cover, wellbeing programmes, Platinum Card vouchers. Phone: +971 4 123 4567 ext. 3 · Email: benefits@emirates.com."
        />
        <InfoSheetSection
          heading="Travel & ID90 (Staff Travel)"
          body="Personal travel bookings, ID90 / industry discounted travel, leisure tickets for you and family. Email: stafftravel@emirates.com · Tickets desk: Emirates Group HQ, Block G, ground floor."
        />
        <InfoSheetSection
          heading="Learning & Development"
          body="Training nominations, certifications, e-learning access. Email: learning@emirates.com · Internal portal: learning.emirates.com."
        />
        <InfoSheetSection
          heading="Confidential / Speak Up"
          body="Raise a concern about workplace conduct, harassment, or compliance. The Speak Up line is anonymous and reaches the Group Ethics office directly. Phone: +971 800 EK ETHIX · Email: ethics@emirates.com."
        />
        <InfoSheetSection
          heading="Visit in person"
          body="Emirates Group Headquarters · Airport Road · Garhoud, Dubai. The HR walk-in counter is on Block G, ground floor, open Sun–Thu 09:00–16:00 GST. Bring your staff ID."
        />
      </InfoSheet>

      <InfoSheet
        visible={infoSheet === 'help'}
        onClose={() => setInfoSheet(null)}
        title="Help Centre"
        subtitle="Common questions and quick fixes">
        <InfoSheetSection
          heading="Signing in"
          body="MyEK uses your Emirates Group Microsoft account. If sign-in fails, make sure you have an active corporate account and a working internet connection. For account lockouts or password resets, contact IT Service Desk via the Emirates Group portal."
        />
        <InfoSheetSection
          heading="Customising your home screen"
          body="Press and hold any widget on the home screen to enter edit mode. Drag to reorder, tap the minus to remove, or open the drawer to add widgets. Tap Done to save. You can also restore the default layout from More → Home Screen → Reset Widget Layout."
        />
        <InfoSheetSection
          heading="Leave & payslip not updating?"
          body="Widgets refresh automatically when you reopen the app or come back online. If a tile shows a small amber dot, the data is stale — pull down on the home screen to force a refresh (coming soon) or relaunch the app."
        />
        <InfoSheetSection
          heading="Business card & QR"
          body="Tap the Business Card widget on the home screen, or tap your profile photo at the top, to open the full-screen ID card with QR/barcode. Tap the card again to flip it and reveal your Platinum membership card (if eligible)."
        />
        <InfoSheetSection
          heading="Offline mode"
          body="MyEK keeps a cached copy of your last fetched widget data so the home screen still works without a connection. Stale tiles are marked with an amber indicator and updated automatically once you're back online."
        />
        <InfoSheetSection
          heading="Reporting an issue"
          body="Found a bug or have a feature request? Email ekgroup-it@emirates.com with a brief description, the screen you were on, and (if possible) a screenshot. Include your device model and OS version to help us reproduce the issue."
        />
        <InfoSheetSection
          heading="Need a human?"
          body="For payroll, leave or roster queries, tap Contact HR on this screen. For technical issues with the app, raise a ticket via the IT Service Desk on the Emirates Group portal."
        />
      </InfoSheet>
    </View>
  );
};

const SupportItem: React.FC<SupportRow & { divider: boolean }> = ({ icon, title, subtitle, onPress, divider }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        opacity: pressed ? 0.7 : 1,
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: theme.colors.line,
      })}>
      <View style={[styles.iconBubble, { backgroundColor: theme.colors.bg }]}>
        <Icon name={icon} size={18} color={theme.colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
};

const ThemeRow: React.FC<{ mode: ThemeMode; onChange: (m: ThemeMode) => void }> = ({ mode, onChange }) => {
  const theme = useTheme();
  const options: ThemeMode[] = ['light', 'dark', 'system'];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.line,
      }}>
      <View style={[styles.iconBubble, { backgroundColor: theme.colors.bg }]}>
        <Icon name={mode === 'dark' ? 'moon' : 'sun'} size={18} color={theme.colors.muted} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>Theme</Text>
      <View style={{ flexDirection: 'row', backgroundColor: theme.colors.bg, borderRadius: 999, padding: 3 }}>
        {options.map(m => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: active ? theme.colors.ekRed : 'transparent',
                borderRadius: 999,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? 'white' : theme.colors.muted }}>
                {m[0].toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          );
        })}
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
  signOut: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
});
