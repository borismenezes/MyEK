import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@theme/index';
import { LeavePlanAnswer } from './answers/LeavePlanAnswer';
import { DaySummaryAnswer } from './answers/DaySummaryAnswer';
import { JiraSnapshotAnswer } from './answers/JiraSnapshotAnswer';
import { MeetingAnswer } from './answers/MeetingAnswer';
import type { AgentMessage, AnswerKind } from '../types';

interface ChatPanelProps {
  messages: AgentMessage[];
}

/**
 * Message list for the AI Agent screen.
 *
 *  - User bubbles: right-aligned, ek-red background, white text.
 *  - Agent bubbles: left-aligned with theme surface. Optionally followed
 *    by a pictorial answer widget rendered full-width below the bubble.
 *  - Auto-scrolls to the bottom on every new message so the latest
 *    response is always above the keyboard fold.
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ messages }) => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 13, color: theme.colors.muted, textAlign: 'center', maxWidth: 280 }}>
          Tap one of the suggestions above, or just say hi. I can pull from leave, payslip, Jira, attendance, and your calendar.
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
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'stretch' }}>
      {message.text ? (
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
                  borderColor: theme.colors.line,
                }),
          }}>
          <Text
            style={{
              fontSize: 14,
              color: isUser ? 'white' : theme.colors.ink,
              lineHeight: 19,
              fontWeight: isUser ? '500' : '400',
            }}>
            {message.text}
          </Text>
        </View>
      ) : null}
      {!isUser && message.answer ? (
        <View style={{ marginTop: message.text ? 8 : 0 }}>
          <PictorialAnswer kind={message.answer} />
        </View>
      ) : null}
    </View>
  );
};

const PictorialAnswer: React.FC<{ kind: AnswerKind }> = ({ kind }) => {
  switch (kind) {
    case 'leavePlan':
      return <LeavePlanAnswer />;
    case 'daySummary':
      return <DaySummaryAnswer />;
    case 'jiraSnapshot':
      return <JiraSnapshotAnswer />;
    case 'meeting':
      return <MeetingAnswer />;
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
});
