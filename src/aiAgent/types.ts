/**
 * A suggestion pill — a canned prompt the user can tap to send to the
 * assistant. Pills are shortcuts to `prompt`; there's no canned response.
 */
export interface AgentQuestion {
  id: string;
  /** Short label shown on the FAQ pill (≈3-5 words). */
  pill: string;
  /** Full prompt sent to the assistant when the pill is tapped. */
  prompt: string;
}

/** A single chat message. */
export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  /** Message body. Empty on an agent message until the first token streams in. */
  text: string;
  /**
   * Agent-message lifecycle: `streaming` while tokens arrive, `done` when the
   * stream completes, `error` if the turn failed. Absent on user messages.
   */
  status?: 'streaming' | 'done' | 'error';
}
