export const tokenKey = "cf_token";
export const authSourceKey = "cf_auth_source";
export const canonicalProfilePath = "/profile/me";
export const supportedCurrencies = ["UZS", "USD", "EUR", "RUB"] as const;
export const weekStartDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export const dashboardRangePresets = ["THIS_WEEK", "THIS_MONTH", "SPECIFIC_MONTH", "CUSTOM"] as const;
export const dashboardViewModes = ["COUPLE", "PERSONAL"] as const;
export const categoryScopes = ["PERSONAL", "SHARED"] as const;
export const dashboardKinds = ["ALL", "EXPENSE", "INCOME"] as const;
export const dashboardActors = ["EVERYONE", "ME", "PARTNER"] as const;

export type SupportedCurrency = (typeof supportedCurrencies)[number];
export type WeekStartDay = (typeof weekStartDays)[number];
export type DashboardRangePreset = (typeof dashboardRangePresets)[number];
export type DashboardViewMode = (typeof dashboardViewModes)[number];
export type CategoryScope = (typeof categoryScopes)[number];
export type DashboardKind = (typeof dashboardKinds)[number];
export type DashboardActor = (typeof dashboardActors)[number];

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
  hasPartnerConnection: boolean;
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
    id: string;
    name: string;
    kind?: "EXPENSE" | "INCOME";
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
  categoryId: string;
  categoryName: string;
  note: string;
};

export type TransactionListCategory = {
  id: string;
  name: string;
  kind?: "EXPENSE" | "INCOME";
};

export type TransactionListUser = {
  firstName: string | null;
  username: string | null;
};

export type TransactionListItem = {
  id: string;
  kind: "EXPENSE" | "INCOME";
  amount: number | string;
  amountInUzs: number | string;
  currency: SupportedCurrency;
  note: string | null;
  happenedAt: string;
  category: TransactionListCategory;
  user: TransactionListUser;
};

export type CategoryTreeNode = {
  id: string;
  name: string;
  kind: "EXPENSE" | "INCOME";
  scope: CategoryScope;
  ownerUserId: string | null;
  isVisible: boolean;
  children: Array<{
    id: string;
    name: string;
    kind: "EXPENSE" | "INCOME";
    scope: CategoryScope;
    ownerUserId: string | null;
    isVisible: boolean;
  }>;
};

export type CategoryCatalogResponse = {
  preferences: {
    showSharedCategories: boolean;
    defaultIncomeCategoryId: string | null;
    defaultExpenseCategoryId: string | null;
  };
  byKind: Record<"EXPENSE" | "INCOME", { personal: CategoryTreeNode[]; shared: CategoryTreeNode[] }>;
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
  showSharedCategories: boolean;
  weekStartsOn: WeekStartDay;
};

export type ProfileSnapshotResponse = {
  profile: ProfileResponse;
  summary: MonthlySummary;
  recent: TransactionListItem[];
  auth: AuthMeResponse;
  categories: CategoryCatalogResponse;
};

export type DashboardTransaction = TransactionListItem;

export type DashboardResponse = {
  profile: ProfileResponse;
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
  recent: TransactionListItem[];
  transactions: {
    items: DashboardTransaction[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  rates: Record<SupportedCurrency, number>;
  supportedCurrencies: SupportedCurrency[];
  filter: {
    preset: DashboardRangePreset;
    viewMode: DashboardViewMode;
    kind: DashboardKind;
    categoryId: string | null;
    actor: DashboardActor;
    search: string;
    timeFrom: string | null;
    timeTo: string | null;
    monthKey: string | null;
    from: string | null;
    to: string | null;
    appliedFrom: string;
    appliedTo: string;
    label: string;
    page: number;
    pageSize: number;
  };
  preferences: {
    weekStartsOn: WeekStartDay;
  };
  availableViews: DashboardViewMode[];
  filters: {
    categories: CategoryCatalogResponse;
    weekStartsOn: WeekStartDay;
  };
  charts: {
    trend: {
      granularity: "DAY" | "WEEK" | "MONTH";
      items: Array<{
        label: string;
        start: string;
        end: string;
        income: number;
        expense: number;
        net: number;
      }>;
    };
    breakdown: {
      items: Array<{
        categoryId: string;
        categoryName: string;
        kind?: "EXPENSE" | "INCOME";
        totalAmountInUzs?: number;
        totalExpense?: number;
        share: number;
      }>;
    };
  };
};

export type AdminAiUsageSummaryResponse = {
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCostMicros: number;
  };
  perModel: Array<{
    model: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCostMicros: number;
  }>;
};

export type AdminAiUsageListResponse = {
  items: Array<{
    id: string;
    provider: string;
    feature: string;
    operation: string;
    status: string;
    model: string;
    endpoint: string;
    correlationId: string;
    providerRequestId: string | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCostMicros: number;
    outputCostMicros: number;
    totalCostMicros: number;
    errorMessage: string | null;
    createdAt: string;
    user: {
      id: string;
      firstName: string | null;
      username: string | null;
      email: string | null;
    } | null;
    couple: {
      id: string;
      name: string;
    } | null;
  }>;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
