import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@theme/index';
import type { AgentQuestion } from '../types';

interface FaqPillsProps {
  questions: AgentQuestion[];
  onPick(question: AgentQuestion): void;
}

/**
 * Horizontal carousel of FAQ pills. The first 3-4 are visible above the
 * fold; the rest scroll into view. Tapping a pill replays the question as
 * a user message and renders the canned agent response.
 */
export const FaqPills: React.FC<FaqPillsProps> = ({ questions, onPick }) => {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.4,
          color: theme.colors.muted,
          paddingHorizontal: 20,
          marginBottom: 10,
        }}>
        TRY ASKING
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {questions.map(q => (
          <Pressable
            key={q.id}
            onPress={() => onPick(q)}
            style={({ pressed }) => [
              styles.pill,
              {
                // Neutral, secondary affordance — greyish, recedes behind the
                // conversation rather than competing with the brand red.
                backgroundColor: theme.colors.line,
                borderColor: theme.colors.line,
                opacity: pressed ? 0.6 : 1,
              },
            ]}>
            <Text style={{ fontSize: 13, fontWeight: '400', color: theme.colors.mutedStrong }}>
              {q.pill}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
