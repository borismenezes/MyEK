import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@components/index';
import { useTheme } from '@theme/index';

interface ChatComposerProps {
  onSubmit(text: string): void;
  /** Fired when the mic button is tapped. Voice input isn't wired up yet,
   *  so the screen surfaces a "coming soon" notification via this callback. */
  onMicPress?(): void;
  placeholder?: string;
}

/**
 * Bottom-anchored composer for the AI Agent screen. Text input on the
 * left, mic affordance in the middle, send button on the right. Send is
 * disabled while the input is empty so the user can't fire blank prompts.
 */
export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSubmit,
  onMicPress,
  placeholder = 'Ask anything…',
}) => {
  const theme = useTheme();
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const canSend = trimmed.length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSend) return;
    onSubmit(trimmed);
    setText('');
  }, [canSend, trimmed, onSubmit]);

  return (
    <View
      style={[
        styles.host,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
        },
      ]}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.bg,
            borderColor: theme.colors.line,
          },
        ]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, { color: theme.colors.ink }]}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline
          maxLength={500}
        />

        <Pressable
          onPress={onMicPress}
          accessibilityRole="button"
          accessibilityLabel="Voice input"
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}>
          <Icon name="mic" size={20} color={theme.colors.muted} stroke={1.8} />
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          hitSlop={6}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: canSend ? theme.colors.ekRed : theme.colors.line,
              opacity: pressed && canSend ? 0.85 : 1,
            },
          ]}>
          <Icon name="arrow-up" size={18} color="white" stroke={2.4} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    maxHeight: 120,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
