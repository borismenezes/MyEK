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
 * Map a raw transport/stream error into a calm, user-facing line. Rate limits
 * (429) are the common one — the assistant should ask the user to wait rather
 * than surface "TOO_MANY_REQUESTS 429".
 */
function friendlyAiError(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (
    s.includes('429') ||
    s.includes('too_many_requests') ||
    s.includes('too many requests') ||
    s.includes('rate limit') ||
    s.includes('rate_limit')
  ) {
    return "I'm getting a lot of requests right now — please wait a few seconds and try again.";
  }
  if (s.includes('overloaded') || s.includes('503') || s.includes('502') || s.includes('500')) {
    return 'The assistant is busy at the moment. Please try again shortly.';
  }
  if (s.includes('401') || s.includes('unauthor') || s.includes('forbidden') || s.includes('403')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (s.includes('network') || s.includes('failed') || s.includes('timeout') || s.includes('timed out')) {
    return 'Could not reach the assistant. Please check your connection and try again.';
  }
  return 'Sorry, something went wrong. Please try again.';
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
        finish(() => handlers.onError(friendlyAiError(String(event.error))));
      } else if (event.done) {
        finish(() => handlers.onDone(event.conversationId ?? null));
      }
    },
    onError: err => {
      log.warn('AI stream transport error', err);
      finish(() => handlers.onError(friendlyAiError(err?.message ?? '')));
    },
    onClose: () => {
      // Closed without a terminal token/error frame.
      finish(() => handlers.onError('The assistant stopped responding. Please try again.'));
    },
  });

  return { cancel: () => handle.abort() };
}
