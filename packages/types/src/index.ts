export type TransactionKind = "EXPENSE" | "INCOME";

export type MembershipRole = "OWNER" | "PARTNER";

export interface AuthUser {
  id: string;
  telegramId: string;
  isAdmin: boolean;
}

export interface MonthlySummary {
  month: number;
  year: number;
  totalExpense: number;
  totalIncome: number;
  balance: number;
}
