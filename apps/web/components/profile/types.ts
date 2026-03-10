export const tokenKey = "cf_token";
export const authSourceKey = "cf_auth_source";
export const canonicalProfilePath = "/profile/me";
export const supportedCurrencies = ["UZS", "USD", "EUR", "RUB"] as const;
export const weekStartDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export const dashboardRangePresets = ["THIS_WEEK", "THIS_MONTH", "CUSTOM"] as const;
export const dashboardViewModes = ["COUPLE", "PERSONAL"] as const;

export type SupportedCurrency = (typeof supportedCurrencies)[number];
export type WeekStartDay = (typeof weekStartDays)[number];
export type DashboardRangePreset = (typeof dashboardRangePresets)[number];
export type DashboardViewMode = (typeof dashboardViewModes)[number];

export type ProfileResponse = {
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    birthday: string | null;
    coupleCode: string;
  };
  activeCouple: {
    id: string;
    name: string;
    role: "OWNER" | "PARTNER";
  } | null;
  bind: {
    insertedCode: string;
    userCoupleCode: string;
    coupleId: string;
    updatedAt: string;
  } | null;
};

export type MonthlySummary = {
  month: number;
  year: number;
  currency: SupportedCurrency;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  personalIncome: number;
  personalExpense: number;
  personalBalance: number;
};

export type RecentTransaction = {
  id: string;
  kind: "EXPENSE" | "INCOME";
  amount: number | string;
  amountInUzs: number | string;
  currency: SupportedCurrency;
  note: string | null;
  happenedAt: string;
  category: {
    name: string;
    kind: "EXPENSE" | "INCOME";
  };
  user: {
    firstName: string | null;
    username: string | null;
  };
};

export type EditableTransaction = {
  id: string;
  amount: string;
  kind: "EXPENSE" | "INCOME";
  currency: SupportedCurrency;
  categoryName: string;
  note: string;
};

export type AuthMeResponse = {
  id: string;
  telegramId: string;
  lastTelegramChatId: string | null;
  email: string | null;
  passwordSetAt: string | null;
  hasPassword: boolean;
  coupleCode: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  birthday: string | null;
  photoUrl: string | null;
  telegramPhone: string | null;
  isAdmin: boolean;
  isDark: boolean;
  weekStartsOn: WeekStartDay;
};

export type ProfileSnapshotResponse = {
  profile: ProfileResponse;
  summary: MonthlySummary;
  recent: RecentTransaction[];
  auth: AuthMeResponse;
};

export type DashboardResponse = {
  profile: {
    user: {
      coupleCode: string;
    };
    activeCouple: {
      name: string;
    } | null;
  };
  summary: {
    month: number;
    year: number;
    currency: "UZS";
    totalIncome: number;
    totalExpense: number;
    balance: number;
    personalIncome: number;
    personalExpense: number;
    personalBalance: number;
  };
  recent: Array<{
    id: string;
    kind: "EXPENSE" | "INCOME";
    amount: number | string;
    amountInUzs: number | string;
    currency: SupportedCurrency;
    note: string | null;
    happenedAt: string;
    category: { name: string };
    user: { firstName: string | null; username: string | null };
  }>;
  rates: Record<SupportedCurrency, number>;
  supportedCurrencies: SupportedCurrency[];
  filter: {
    preset: DashboardRangePreset;
    from: string | null;
    to: string | null;
    appliedFrom: string;
    appliedTo: string;
    label: string;
  };
  preferences: {
    weekStartsOn: WeekStartDay;
  };
  availableViews: DashboardViewMode[];
};
