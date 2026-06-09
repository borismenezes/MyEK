import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const EK_RED = '#d71921';
const INK = '#1a1a1c';
const MUTED = '#6b6b70';

/**
 * Leave detail screen — the `leave` remote's federated screen (`./screens`),
 * mounted by the host via FederatedRemote. Self-contained for the pilot; will
 * adopt the shared design system + live data wiring in a later slice.
 */
export default function LeaveScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Leave</Text>
        <Text style={styles.sub}>Federated remote · leave</Text>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Loaded over Module Federation from the MyEK host shell.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 20, gap: 8 },
  title: { fontSize: 28, fontWeight: '800', color: INK, letterSpacing: -0.5 },
  sub: { fontSize: 13, fontWeight: '600', color: MUTED },
  banner: { marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: EK_RED },
  bannerText: { fontSize: 14, color: INK, lineHeight: 20 },
});
