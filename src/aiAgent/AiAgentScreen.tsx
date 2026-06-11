import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { UpcomingFeatureToast } from '@components/index';
import { useTheme } from '@theme/index';
import { AnimatedGradientBanner } from './components/AnimatedGradientBanner';
import { FaqPills } from './components/FaqPills';
import { ChatPanel } from './components/ChatPanel';
import { ChatComposer } from './components/ChatComposer';
import { AGENT_QUESTIONS } from './data/questions';
import { useAiAgentStore } from './store';
import type { AgentQuestion } from './types';

/**
 * AI Agent tab — animated gradient banner, leave-scoped suggestion pills, and a
 * chat transcript streamed live from the backend AI service (`/v1/ai/chat`).
 * Conversation state lives in {@link useAiAgentStore} so it survives tab
 * switches; the assistant streams token-by-token and keeps thread history
 * server-side via the conversation id.
 */
export const AiAgentScreen: React.FC = () => {
  const theme = useTheme();
  const messages = useAiAgentStore(s => s.messages);
  const isStreaming = useAiAgentStore(s => s.isStreaming);
  const send = useAiAgentStore(s => s.send);
  const [toastKey, setToastKey] = useState(0);

  const handlePick = useCallback((question: AgentQuestion) => send(question.prompt), [send]);
  const handleSubmit = useCallback((text: string) => send(text), [send]);

  const handleMicPress = useCallback(() => {
    // Voice input isn't wired yet — surface the standard "coming soon"
    // toast so taps aren't silent.
    setToastKey(k => k + 1);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <StatusBar barStyle="light-content" />
      <AnimatedGradientBanner />
      <KeyboardAvoidingView
        // Android 15+/RN edge-to-edge no longer honors adjustResize, so the bare
        // window doesn't lift for the keyboard — give Android a real behavior.
        // iOS keeps 'padding'; Android uses 'height' (shrinks the container so the
        // bottom-anchored composer rises above the keyboard).
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
        style={styles.body}>
        <View style={{ flex: 1 }}>
          <ChatPanel messages={messages} />
        </View>
        {/* Suggestion pills sit directly above the composer as a quick-action
            row — only while the conversation is empty; they fall away once the
            user starts interacting so the chat owns the space. */}
        {messages.length === 0 ? (
          <View style={{ paddingTop: 10, paddingBottom: 8 }}>
            <FaqPills questions={AGENT_QUESTIONS} onPick={handlePick} />
          </View>
        ) : null}
        <ChatComposer
          onSubmit={handleSubmit}
          onMicPress={handleMicPress}
          disabled={isStreaming}
          placeholder={isStreaming ? 'Assistant is replying…' : 'Ask about your leave…'}
        />
      </KeyboardAvoidingView>
      <UpcomingFeatureToast
        triggerKey={toastKey}
        message="Voice input is on the way"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
