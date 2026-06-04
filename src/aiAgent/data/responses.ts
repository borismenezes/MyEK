import { useAuthStore } from '@store/useAuthStore';
import { AGENT_QUESTIONS } from './questions';
import type { AgentMessage, AgentQuestion } from '../types';

let idCounter = 0;
const nextId = () => `msg-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/**
 * Build a personalised agent message for a given question. Substitutes
 * `{firstName}`, `{employeeId}`, and `{jobTitle}` against the auth store at
 * the moment the message is created.
 */
export function buildAgentResponse(question: AgentQuestion): AgentMessage {
  return {
    id: nextId(),
    role: 'agent',
    text: question.text ? personalise(question.text) : undefined,
    answer: question.answer,
  };
}

export function buildUserMessage(question: AgentQuestion): AgentMessage {
  return {
    id: nextId(),
    role: 'user',
    text: personalise(question.prompt),
  };
}

export function findQuestionById(id: string): AgentQuestion | undefined {
  return AGENT_QUESTIONS.find(q => q.id === id);
}

/**
 * Wrap raw user input as a chat message.
 */
export function buildFreeTextUserMessage(text: string): AgentMessage {
  return { id: nextId(), role: 'user', text };
}

/**
 * Best-effort match of a free-text prompt against the configured FAQs. We
 * tokenise both sides and score by overlap of distinctive words — anything
 * that scores ≥ 2 hits returns the canned response for that FAQ, otherwise
 * the caller falls back to a generic "I don't know that yet" reply.
 */
export function matchFreeTextToQuestion(text: string): AgentQuestion | undefined {
  const tokens = tokenise(text);
  if (tokens.length === 0) return undefined;
  let best: { q: AgentQuestion; score: number } | undefined;
  for (const q of AGENT_QUESTIONS) {
    const haystack = new Set([...tokenise(q.pill), ...tokenise(q.prompt)]);
    let score = 0;
    for (const t of tokens) if (haystack.has(t)) score++;
    if (score >= 2 && (!best || score > best.score)) {
      best = { q, score };
    }
  }
  return best?.q;
}

/**
 * Generic agent fallback for free-text we couldn't match against a known
 * FAQ. Surfaces a couple of suggested prompts so the user has a way
 * forward.
 */
export function buildGenericAgentReply(): AgentMessage {
  return {
    id: nextId(),
    role: 'agent',
    text: personalise(
      "I don't have an answer for that yet, {firstName}. Try one of the suggestions above — I can pull from leave, payslip, attendance, Jira, meetings, and your documents.",
    ),
  };
}

// Stopwords removed before scoring so common verbs/prepositions don't
// inflate the match. Kept short — the FAQ corpus is small.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'do', 'does', 'have', 'has', 'me', 'my',
  'i', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'this', 'that', 'with',
  'show', 'tell', 'about', 'please', 'can', 'you', 'what', 'when', 'how',
  'much', 'any', 'some',
]);

function tokenise(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function personalise(template: string): string {
  const user = useAuthStore.getState().user;
  return template
    .replace(/\{firstName\}/g, user?.firstName ?? 'there')
    .replace(/\{lastName\}/g, user?.lastName ?? '')
    .replace(/\{employeeId\}/g, user?.employeeId ?? '—')
    .replace(/\{jobTitle\}/g, user?.jobTitle ?? 'an Emirates Group employee');
}
