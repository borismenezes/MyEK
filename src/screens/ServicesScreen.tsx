import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, Icon, PayslipSheet, resolveIconName } from '@components/index';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';
import { DEFAULT_LAYOUT_ORDER, getRegistryEntry } from '@widgets/index';

/** Home widgets NOT surfaced on the Services tab: the identity card (lives on its
 * own home widget + the top-right profile avatar) and applications (no detail
 * surface to open). */
const SERVICES_HIDDEN = new Set(['businessCard', 'applications']);

/**
 * Services tab — mirrors the home widget set (minus the hidden ones). Each item
 * opens the same surface as tapping its home widget: Payslip → the bottom-sheet,
 * anything with a detail surface (Leave / Attendance / Timesheet) → its Detail
 * screen.
 */
export const ServicesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [payslipOpen, setPayslipOpen] = useState(false);
  const manifest = useAuthStore(s => s.manifest);
  // Same set the home grid renders (registry curated order), minus hidden ones.
  const services = DEFAULT_LAYOUT_ORDER
    .filter(id => !SERVICES_HIDDEN.has(id))
    .map(id => ({ id, entry: getRegistryEntry(id) }))
    .filter((s): s is { id: string; entry: NonNullable<typeof s.entry> } => s.entry !== null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, paddingTop: insets.top + 8 },
        ]}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.5 }}>Services</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <SectionHeader title={`${services.length} APPS AVAILABLE`} />
          <Card padded={false}>
            {services.map(({ id, entry }, idx) => {
              // Mirror the home-widget tap: payslip opens the bottom-sheet,
              // anything with a detail surface opens its Detail screen, and
              // widgets without one (e.g. applications) stay non-tappable.
              const detailEntry = manifest.find(m => m.appName === id && m.detail);
              const onPress =
                id === 'payslip'
                  ? () => setPayslipOpen(true)
                  : detailEntry
                    ? () => navigation.navigate('Detail', { appName: id })
                    : undefined;
              return (
                <ServiceItem
                  key={id}
                  icon={resolveIconName(entry.icon, id)}
                  title={entry.name}
                  divider={idx < services.length - 1}
                  onPress={onPress}
                />
              );
            })}
          </Card>
        </View>
      </ScrollView>

      <PayslipSheet visible={payslipOpen} onClose={() => setPayslipOpen(false)} />
    </View>
  );
};

interface ServiceItemProps {
  icon: string;
  title: string;
  divider: boolean;
  onPress?: () => void;
}

const ServiceItem: React.FC<ServiceItemProps> = ({ icon, title, divider, onPress }) => {
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
      <View style={[styles.iconBubble, { backgroundColor: 'rgba(198,12,48,0.08)' }]}>
        <Icon name={icon as any} size={18} color={theme.colors.ekRed} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>{title}</Text>
      </View>
      {onPress ? <Icon name="chevron" size={14} color={theme.colors.muted} /> : null}
    </Pressable>
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
});
