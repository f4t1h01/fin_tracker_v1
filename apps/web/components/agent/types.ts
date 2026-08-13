export type AgentMessageRole = "USER" | "AGENT";

export type AgentMessage = {
  id: string;
  role: AgentMessageRole;
  text: string;
  createdAt: string;
};

export type AgentThread = {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
};

export type AgentThreadSummary = {
  id: string;
  title: string;
  isPinned: boolean;
  updatedAt: string;
  preview: string;
};
