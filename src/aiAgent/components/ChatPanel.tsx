import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '@theme/index';
import type { Theme } from '@/types';
import type { AgentMessage } from '../types';

interface ChatPanelProps {
  messages: AgentMessage[];
}

/**
 * Message list for the AI Agent screen.
 *
 *  - User bubbles: right-aligned, ek-red background, white text.
 *  - Agent bubbles: left-aligned with theme surface; text streams in
 *    token-by-token, with a typing indicator until the first token lands.
 *  - Auto-scrolls to the bottom as the latest reply grows.
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ messages }) => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Re-scroll on new messages AND as the streaming reply grows. Keyed on the
  // last message's length so each streamed token nudges the view to the end.
  const last = messages[messages.length - 1];
  const tailLength = last ? last.text.length : 0;
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length, tailLength]);

  if (messages.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 13, color: theme.colors.muted, textAlign: 'center', maxWidth: 280 }}>
          Ask me about your leave — your balance, planning time off, the status of a
          request, or how much you'll have accrued.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 10 }}
      showsVerticalScrollIndicator={false}>
      {messages.map(m => (
        <MessageBubble key={m.id} message={m} />
      ))}
    </ScrollView>
  );
};

const MessageBubble: React.FC<{ message: AgentMessage }> = ({ message }) => {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  // Empty agent bubble that's still streaming → show the typing indicator.
  const showTyping = !isUser && message.status === 'streaming' && message.text.length === 0;
  const markdownStyles = useMemo(() => buildMarkdownStyles(theme), [theme]);

  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'stretch' }}>
      {message.text || showTyping ? (
        <View
          style={{
            maxWidth: isUser ? '85%' : '100%',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: isUser ? theme.colors.ekRed : theme.colors.surface,
            borderTopRightRadius: isUser ? 4 : 16,
            borderTopLeftRadius: isUser ? 16 : 4,
            ...(isUser
              ? {}
              : {
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isError ? theme.colors.ekRed : theme.colors.line,
                }),
          }}>
          {showTyping ? (
            <TypingDots color={theme.colors.muted} />
          ) : isUser || isError ? (
            <Text
              style={{
                fontSize: 14,
                color: isUser ? 'white' : theme.colors.ekRed,
                lineHeight: 19,
                fontWeight: isUser ? '500' : '400',
              }}>
              {message.text}
            </Text>
          ) : (
            // Assistant replies are markdown (bold, lists, paragraphs).
            <Markdown style={markdownStyles}>{message.text}</Markdown>
          )}
        </View>
      ) : null}
    </View>
  );
};

/** Lightweight animated "…" without pulling in reanimated. */
const TypingDots: React.FC<{ color: string }> = ({ color }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 4), 350);
    return () => clearInterval(id);
  }, []);
  return (
    <Text style={{ fontSize: 16, color, lineHeight: 19, letterSpacing: 2 }}>
      {'•'.repeat(step === 0 ? 1 : step)}
    </Text>
  );
};

/** Themed markdown styles for assistant replies — tuned to read like a chat bubble. */
const buildMarkdownStyles = (theme: Theme) => ({
  body: { color: theme.colors.ink, fontSize: 14, lineHeight: 19 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: '700' as const, color: theme.colors.ink },
  em: { fontStyle: 'italic' as const },
  heading1: { fontSize: 17, fontWeight: '700' as const, color: theme.colors.ink, marginBottom: 6 },
  heading2: { fontSize: 16, fontWeight: '700' as const, color: theme.colors.ink, marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.ink, marginBottom: 4 },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  bullet_list_icon: { color: theme.colors.ekRed },
  ordered_list_icon: { color: theme.colors.ekRed },
  link: { color: theme.colors.ekRed, textDecorationLine: 'underline' as const },
  code_inline: {
    backgroundColor: theme.colors.bg,
    color: theme.colors.ink,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  fence: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 10,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: theme.colors.bg,
    borderLeftColor: theme.colors.line,
    borderLeftWidth: 3,
    paddingHorizontal: 10,
  },
  hr: { backgroundColor: theme.colors.line, height: StyleSheet.hairlineWidth },
});

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
});
