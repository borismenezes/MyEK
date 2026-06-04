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
import {
  buildAgentResponse,
  buildFreeTextUserMessage,
  buildGenericAgentReply,
  buildUserMessage,
  matchFreeTextToQuestion,
} from './data/responses';
import type { AgentMessage, AgentQuestion } from './types';

/**
 * AI Agent tab — animated gradient banner up top, FAQ pills, then a
 * chat-style transcript that builds up as the user taps prompts or types
 * a question into the composer. All responses are hardcoded for now;
 * replace the `match` / `build…Reply` calls with a real LLM call when a
 * backend is available.
 */
export const AiAgentScreen: React.FC = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [toastKey, setToastKey] = useState(0);

  const handlePick = useCallback((question: AgentQuestion) => {
    const user = buildUserMessage(question);
    const agent = buildAgentResponse(question);
    setMessages(prev => [...prev, user, agent]);
  }, []);

  const handleSubmit = useCallback((text: string) => {
    const user = buildFreeTextUserMessage(text);
    const match = matchFreeTextToQuestion(text);
    const agent = match ? buildAgentResponse(match) : buildGenericAgentReply();
    setMessages(prev => [...prev, user, agent]);
  }, []);

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
        style={styles.body}>
        <View style={{ paddingTop: 16, paddingBottom: 12 }}>
          <FaqPills questions={AGENT_QUESTIONS} onPick={handlePick} />
        </View>
        <View style={{ flex: 1 }}>
          <ChatPanel messages={messages} />
        </View>
        <ChatComposer
          onSubmit={handleSubmit}
          onMicPress={handleMicPress}
          placeholder="Ask anything…"
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
