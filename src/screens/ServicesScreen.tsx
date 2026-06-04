import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, Icon } from '@components/index';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';

/**
 * Services tab — lists every internal app the user has access to.
 * Driven by `apps` from the auth bootstrap, so the server controls the catalogue.
 */
export const ServicesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const apps = useAuthStore(s => s.apps).filter(a => a.enabled);
  const manifest = useAuthStore(s => s.manifest);

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
          <SectionHeader title={`${apps.length} APPS AVAILABLE`} />
          <Card padded={false}>
            {apps.map((app, idx) => {
              const detailEntry = manifest.find(m => m.appName === app.appId && m.detail);
              return (
                <ServiceItem
                  key={app.appId}
                  icon={app.icon}
                  title={app.name}
                  divider={idx < apps.length - 1}
                  onPress={detailEntry ? () => navigation.navigate('Detail', { appName: app.appId }) : undefined}
                />
              );
            })}
          </Card>
        </View>
      </ScrollView>
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
      <Icon name="chevron" size={14} color={theme.colors.muted} />
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
