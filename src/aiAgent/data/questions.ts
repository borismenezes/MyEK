import type { AgentQuestion } from '../types';

/**
 * 15 hardcoded prompts the AI Agent recognises. The first four surface as
 * FAQ pills below the banner; the rest are reachable by scrolling the pill
 * row horizontally. Order matters — earlier entries land above the fold.
 *
 * `answer` selects the visual renderer (a pictorial widget for a few,
 * a plain text bubble for the rest). `text` is the lead-in copy and, for
 * `answer: 'text'`, the entire body.
 *
 * Strings reference `{firstName}` / `{employeeId}` / `{jobTitle}` —
 * `responses.ts` substitutes those at runtime against the auth store so
 * the chat reads as personalised.
 */
export const AGENT_QUESTIONS: AgentQuestion[] = [
  {
    id: 'plan-leave',
    pill: 'Plan my leave',
    prompt: 'Want to plan my leave — share the best days to take off.',
    answer: 'leavePlan',
    text: 'Looking at the regional holiday calendar and your current balance, stitching these days together gets you the longest break for the fewest leaves spent.',
  },
  {
    id: 'day-summary',
    pill: 'Summary of my day',
    prompt: 'Share a summary of my day — what is pending?',
    answer: 'daySummary',
    text: 'Here\'s where {firstName}\'s day stands right now — timesheet, meetings, attendance, and Jira at a glance.',
  },
  {
    id: 'jira-open',
    pill: 'My open Jira tickets',
    prompt: 'Show my open Jira tickets grouped by status.',
    answer: 'jiraSnapshot',
    text: 'You currently have 6 tickets assigned. Two are blocked — worth unblocking those first.',
  },
  {
    id: 'next-meeting',
    pill: 'My next meeting',
    prompt: 'What\'s my next meeting?',
    answer: 'meeting',
    text: 'Up next on {firstName}\'s calendar:',
  },
  {
    id: 'leave-balance',
    pill: 'Leave balance',
    prompt: 'How much annual leave do I have remaining?',
    answer: 'text',
    text: 'You have **18 days** of annual leave remaining out of 30 for this cycle. 3 days are pending approval. Carry-over is allowed up to 5 days at the year-end cut-off.',
  },
  {
    id: 'payslip-next',
    pill: 'Next payslip',
    prompt: 'When will my next payslip be available?',
    answer: 'text',
    text: 'Your next pay advice for **May 2026** is scheduled to be credited on **28 May 2026**. Earnings statements typically appear in MyEK 24 hours after payroll runs.',
  },
  {
    id: 'leave-file',
    pill: 'File a leave request',
    prompt: 'Help me file a leave request.',
    answer: 'text',
    text: 'Sure {firstName} — I can prefill a leave request. Tell me the start date, end date, and reason, and I\'ll draft it for your line manager\'s approval. (For now, the formal flow is in the Leave service: Services → Leave Balance → Apply.)',
  },
  {
    id: 'attendance-week',
    pill: 'Attendance this week',
    prompt: 'How is my attendance this week?',
    answer: 'text',
    text: 'You have **38h 30m** logged across Mon–Fri, ~1h 30m short of the 40h target. Wednesday is your lightest day so far (6h 45m). Tomorrow you\'re tracking on schedule.',
  },
  {
    id: 'platinum',
    pill: 'My Platinum vouchers',
    prompt: 'Show me my Platinum-card vouchers.',
    answer: 'text',
    text: 'You have **4 active vouchers** with a combined face value of AED 1,250 — Lulu, Carrefour, Careem, and Noon. Open the Platinum Vouchers app under Services for redemption codes.',
  },
  {
    id: 'documents-expiring',
    pill: 'Documents expiring',
    prompt: 'Are any of my documents expiring soon?',
    answer: 'text',
    text: 'Your **passport** expires in **92 days** (1 Aug 2026). That\'s within the 6-month window — worth booking a renewal appointment. No other documents on file are flagged for now.',
  },
  {
    id: 'staff-travel',
    pill: 'Find staff travel',
    prompt: 'Find me cheap staff travel to London next month.',
    answer: 'text',
    text: 'I see **6 ID90-priced flights** to LHR between 14–28 Jun. Cheapest is EK0001 on 24 Jun at AED 1,140 economy. Want me to draft an ID90 booking request? You can also book direct via Services → My Trips.',
  },
  {
    id: 'reporting-line',
    pill: 'My reporting line',
    prompt: 'Who is in my reporting line?',
    answer: 'text',
    text: 'Your direct manager is **Boris Menezes** (Senior Technical Software Engineer · IT-EIT). Skip-level is **Priya Anand** (Director, Employee Experience). Both are reachable on Microsoft Teams.',
  },
  {
    id: 'birthdays',
    pill: 'Team birthdays today',
    prompt: 'Are there any team birthdays today?',
    answer: 'text',
    text: 'Two of your peers are celebrating today — say hi 🎉 to **Aman Patel** (Senior QA) and **Lara Becker** (Product Designer). The Celebrations widget on Home also surfaces these when they\'re live.',
  },
  {
    id: 'timesheet-last-week',
    pill: 'Last week\'s timesheet',
    prompt: 'Summarise my timesheet for last week.',
    answer: 'text',
    text: 'Last week you billed **40h 30m** across 11 entries. 65% on engineering features, 20% on reviews, 15% on meetings. Friday came in 2h under target — looked like a half-day off. Want me to flag anything for approval?',
  },
  {
    id: 'employee-id',
    pill: 'My employee ID',
    prompt: 'Remind me of my employee ID.',
    answer: 'text',
    text: 'You\'re **{employeeId} · {firstName}**, currently assigned as {jobTitle}. The full ID card lives behind your avatar in the top-right of Home (tap to flip for QR/barcode).',
  },
];
