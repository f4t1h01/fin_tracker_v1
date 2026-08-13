import { BellRing, Carrot, PieChart, Wallet, type LucideIcon } from "lucide-react";

/**
 * Everything in this file is the stand-in for the agent backend.
 *
 * The AI Agent surface is shipped as an interface first: no API route, no model
 * call, no persistence beyond the browser. Every reply comes from
 * `agentPreviewReply` below. When the real endpoint lands, delete this file and
 * `agent-local-store.ts`; nothing else in `components/agent/` knows that the
 * answers are scripted.
 */

export const agentPreviewReply =
  "Hi! Nothing is wired up here yet — this is the AI Agent interface preview, so every answer is this same scripted note.\n\nSoon I'll live on top of your Duet data: logging transactions as you describe them, answering questions about where the money went, watching your goods, and keeping your reminders.";

/** Long enough for the typing indicator to register, short enough not to feel broken. */
export const agentPreviewReplyDelayMs = 900;

export type AgentSuggestion = {
  id: string;
  label: string;
  prompt: string;
  icon: LucideIcon;
};

export const agentSuggestions: readonly AgentSuggestion[] = [
  {
    id: "log-expense",
    label: "Log a transaction",
    prompt: "Add a 45 000 UZS lunch expense for today",
    icon: Wallet
  },
  {
    id: "spending-question",
    label: "Ask about spending",
    prompt: "How much did we spend on groceries this month?",
    icon: PieChart
  },
  {
    id: "pantry",
    label: "Check the pantry",
    prompt: "What can I cook tonight with what we already have?",
    icon: Carrot
  },
  {
    id: "reminder",
    label: "Set a reminder",
    prompt: "Remind me to pay the rent on the 1st",
    icon: BellRing
  }
];
