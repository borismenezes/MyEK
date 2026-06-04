import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@components/index';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DetailLayoutRegistry } from './DetailLayoutRegistry';

type DetailRouteParams = { Detail: { appName: string } };

/**
 * Generic detail screen.
 *
 *  - Reads `appName` from route params and looks the entry up in
 *    `auth.manifest`.
 *  - Renders the layout component registered for `entry.detail.layout`.
 *  - Header shows the human-readable `applicationName` and a back chevron;
 *    the native-stack swipe-back gesture remains active so users can also
 *    swipe left-to-right to dismiss.
 */
export const DetailScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<DetailRouteParams, 'Detail'>>();
  const navigation = useNavigation();
  const manifest = useAuthStore(s => s.manifest);
  const entry = manifest.find(m => m.appName === route.params.appName);
  const Layout = entry?.detail ? DetailLayoutRegistry[entry.detail.layout] : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, paddingTop: insets.top + 8 },
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4, marginLeft: -4 })}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevron" size={20} color={theme.colors.ink} />
            </View>
          </Pressable>
          <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.5 }}>
            {entry?.applicationName ?? 'Details'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
        {Layout && entry ? (
          <Layout entry={entry} />
        ) : (
          <View style={styles.empty}>
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
              No detail view configured for this app.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  empty: { paddingTop: 80, alignItems: 'center' },
});
