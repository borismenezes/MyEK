import { config } from '@config/index';
import { endpoints } from '@api/endpoints';
import { streamSsePost } from '@api/sseClient';
import { useAuthStore } from '@store/useAuthStore';
import { createLogger } from '@utils/logger';

const log = createLogger('Service/AiAgent');

export interface ChatStreamHandlers {
  /** A streamed text token to append to the assistant message. */
  onToken: (token: string) => void;
  /** Stream completed; `conversationId` continues the thread on the next turn. */
  onDone: (conversationId: string | null) => void;
  /** Terminal error; `message` is user-facing. */
  onError: (message: string) => void;
}

export interface ChatStreamHandle {
  cancel: () => void;
}

/**
 * Streams one assistant turn from the backend AI service
 * (`POST /v1/ai/chat`, SSE). The server keeps conversation history keyed by
 * `conversationId` + the signed-in user, so only the new message is sent.
 *
 * Wire events: `{"token":"…"}` per chunk, `{"error":"…"}` on failure, and a
 * final `{"done":true,"conversationId":"…"}` that carries the id for the next
 * turn.
 */
export function streamChat(
  message: string,
  conversationId: string | null,
  handlers: ChatStreamHandlers,
): ChatStreamHandle {
  const token = useAuthStore.getState().session?.accessToken;
  if (!token) {
    handlers.onError('Please sign in to use the assistant.');
    return { cancel: () => {} };
  }

  // apiClient is axios (can't stream), so build the URL directly. Same Kong
  // host + the same single bearer the rest of the app uses.
  const url = `${config.api.baseUrl}/${config.api.defaultVersion}${endpoints.ai.chat}`;
  let settled = false;
  const finish = (fn: () => void) => {
    if (settled) return;
    settled = true;
    fn();
  };

  const handle = streamSsePost({
    url,
    headers: { Authorization: `Bearer ${token}` },
    body: { message, conversationId: conversationId ?? undefined },
    onEvent: data => {
      let event: { token?: string; error?: string; done?: boolean; conversationId?: string };
      try {
        event = JSON.parse(data);
      } catch {
        log.warn('Unparseable SSE frame', { data });
        return;
      }
      if (typeof event.token === 'string') {
        handlers.onToken(event.token);
      } else if (event.error) {
        finish(() => handlers.onError(String(event.error)));
      } else if (event.done) {
        finish(() => handlers.onDone(event.conversationId ?? null));
      }
    },
    onError: err => {
      log.warn('AI stream transport error', err);
      finish(() => handlers.onError('Could not reach the assistant. Please try again.'));
    },
    onClose: () => {
      // Closed without a terminal token/error frame.
      finish(() => handlers.onError('The assistant stopped responding. Please try again.'));
    },
  });

  return { cancel: () => handle.abort() };
}
