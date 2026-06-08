import { create } from 'zustand';
import { streamChat } from './aiAgentService';
import type { AgentMessage } from './types';

/**
 * Conversation state for the AI Agent tab. Lives in a store (not screen state)
 * so the thread survives tab switches. The streaming cancel handle is kept
 * module-level — it's imperative and shouldn't trigger re-renders.
 */

let activeCancel: (() => void) | null = null;
let counter = 0;
const nextId = (): string => `msg-${Date.now().toString(36)}-${counter++}`;

interface AiAgentState {
  messages: AgentMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  /** Send a user turn and stream the assistant reply. No-ops while streaming. */
  send: (text: string) => void;
  /** Abort the in-flight stream, keeping whatever streamed so far. */
  stop: () => void;
  /** Clear the conversation. */
  reset: () => void;
}

export const useAiAgentStore = create<AiAgentState>((set, get) => ({
  messages: [],
  conversationId: null,
  isStreaming: false,

  send: text => {
    const trimmed = text.trim();
    if (!trimmed || get().isStreaming) return;

    const userMessage: AgentMessage = { id: nextId(), role: 'user', text: trimmed };
    const agentId = nextId();
    const agentMessage: AgentMessage = { id: agentId, role: 'agent', text: '', status: 'streaming' };
    set(state => ({
      messages: [...state.messages, userMessage, agentMessage],
      isStreaming: true,
    }));

    const patchAgent = (fn: (m: AgentMessage) => AgentMessage) =>
      set(state => ({
        messages: state.messages.map(m => (m.id === agentId ? fn(m) : m)),
      }));

    const handle = streamChat(trimmed, get().conversationId, {
      onToken: token => patchAgent(m => ({ ...m, text: m.text + token })),
      onDone: conversationId => {
        activeCancel = null;
        set({ isStreaming: false, conversationId: conversationId ?? get().conversationId });
        patchAgent(m => ({ ...m, status: 'done' }));
      },
      onError: message => {
        activeCancel = null;
        set({ isStreaming: false });
        // Keep partial text if any streamed; otherwise show the error inline.
        patchAgent(m => ({ ...m, text: m.text || message, status: 'error' }));
      },
    });
    activeCancel = handle.cancel;
  },

  stop: () => {
    activeCancel?.();
    activeCancel = null;
    set({ isStreaming: false });
  },

  reset: () => {
    activeCancel?.();
    activeCancel = null;
    set({ messages: [], conversationId: null, isStreaming: false });
  },
}));
