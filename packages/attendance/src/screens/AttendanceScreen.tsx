import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@myek/ui';

/** Attendance detail screen — the `attendance` remote's federated `./screens`. */
export default function AttendanceScreen(): React.ReactElement {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.ink }]}>Attendance</Text>
        <Text style={[styles.sub, { color: theme.colors.muted }]}>Federated remote · attendance</Text>
        <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.green }]}>
          <Text style={[styles.bannerText, { color: theme.colors.ink }]}>
            Loaded over Module Federation from the MyEK host shell.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, fontWeight: '600' },
  banner: { marginTop: 16, padding: 16, borderRadius: 14, borderLeftWidth: 4 },
  bannerText: { fontSize: 14, lineHeight: 20 },
});
