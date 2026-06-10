import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@myek/ui';
export default function BusinessCardScreen(): React.ReactElement {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.ink }]}>Business Card</Text>
        <Text style={[styles.sub, { color: theme.colors.muted }]}>Federated remote · business_card</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 8 }, title: { fontSize: 28, fontWeight: '800' }, sub: { fontSize: 13, fontWeight: '600' } });
