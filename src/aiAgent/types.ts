/**
 * Identifier for the visual answer renderer. `text` is the fallback for any
 * question that doesn't have a pictorial widget bound to it.
 */
export type AnswerKind =
  | 'text'
  | 'leavePlan'
  | 'daySummary'
  | 'jiraSnapshot'
  | 'meeting';

export interface AgentQuestion {
  id: string;
  /** Short label shown on the FAQ pill (≈3-5 words). */
  pill: string;
  /** Full prompt the user "asks" when they tap the pill. */
  prompt: string;
  /** Visual style of the response. */
  answer: AnswerKind;
  /** Optional text body — used by `answer: 'text'` and as the lead-in for
   *  pictorial answers (rendered above the widget card). */
  text?: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  /** The body for plain text messages. For agent messages with a pictorial
   *  answer, this is the lead-in text rendered above the widget. */
  text?: string;
  /** Pictorial answer renderer key. Only set on agent messages. */
  answer?: AnswerKind;
}
