import type { AgentQuestion } from '../types';

/**
 * Suggestion pills surfaced below the banner. The assistant is scoped to leave
 * management, so the pills are leave prompts it can actually answer — tapping
 * one sends `prompt` to the live AI; there are no canned replies.
 */
export const AGENT_QUESTIONS: AgentQuestion[] = [
  {
    id: 'leave-balance',
    pill: 'Leave balance',
    prompt: "What's my current leave balance?",
  },
  {
    id: 'leave-plan',
    pill: 'Plan my leave',
    prompt: 'Help me plan my annual leave over the next few months.',
  },
  {
    id: 'leave-requests',
    pill: 'My requests',
    prompt: 'Show me the status of my leave requests.',
  },
  {
    id: 'leave-accrual',
    pill: 'Leave accrual',
    prompt: 'How much annual leave will I have accrued by the end of next month?',
  },
  {
    id: 'leave-apply',
    pill: 'Apply for leave',
    prompt: 'I want to request annual leave.',
  },
];
