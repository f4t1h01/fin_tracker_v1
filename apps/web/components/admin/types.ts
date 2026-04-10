export type AdminSession = {
  email: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export type AdminDashboardResponse = {
  metrics: {
    users: number;
    couples: number;
    transactions: number;
    categories: number;
    admins: number;
    aiRequests: number;
    aiSpendMicros: number;
    aiErrors: number;
    auditErrors: number;
  };
  recentActivity: {
    transactions: Array<{
      id: string;
      kind: "EXPENSE" | "INCOME";
      amount: number;
      currency: string;
      happenedAt: string;
      category: { id: string; name: string };
      user: { id: string; firstName: string | null; username: string | null; email: string | null };
      couple: { id: string; name: string };
    }>;
    aiErrors: Array<{
      id: string;
      model: string;
      operation: string;
      errorMessage: string | null;
      createdAt: string;
      user: { id: string; firstName: string | null; username: string | null; email: string | null } | null;
      couple: { id: string; name: string } | null;
    }>;
    audit: Array<{
      id: string;
      adminEmail: string | null;
      actionType: string;
      targetType: string | null;
      targetId: string | null;
      outcome: string;
      createdAt: string;
      errorMessage: string | null;
    }>;
  };
};

export type AdminPaginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminUserListItem = {
  id: string;
  telegramId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  coupleCode: string | null;
  isAdmin: boolean;
  createdAt: string;
  bind: {
    coupleId: string;
    insertedCode: string;
    updatedAt: string;
    couple: { id: string; name: string };
  } | null;
  memberships: Array<{
    role: string;
    couple: { id: string; name: string };
  }>;
  counts: {
    transactions: number;
    aiUsage: number;
  };
};

export type AdminUserDetailResponse = {
  user: {
    id: string;
    telegramId: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    coupleCode: string | null;
    isAdmin: boolean;
    showSharedCategories: boolean;
    weekStartsOn: string;
    createdAt: string;
    bind: AdminUserListItem["bind"];
    memberships: Array<{
      role: string;
      createdAt: string;
      couple: { id: string; name: string };
    }>;
    defaults: {
      income: { id: string; name: string } | null;
      expense: { id: string; name: string } | null;
    };
  };
  summary: {
    transactionCount: number;
    totalAmountInUzs: number;
  };
  recentTransactions: Array<{
    id: string;
    kind: string;
    amount: number;
    amountInUzs: number;
    currency: string;
    note: string | null;
    happenedAt: string;
    category: { id: string; name: string; kind: string };
    couple: { id: string; name: string };
  }>;
  recentAiUsage: Array<{
    id: string;
    model: string;
    operation: string;
    status: string;
    totalTokens: number;
    totalCostMicros: number;
    createdAt: string;
    couple: { id: string; name: string } | null;
  }>;
};

export type AdminCoupleListItem = {
  id: string;
  name: string;
  createdAt: string;
  members: Array<{
    role: string;
    user: { id: string; firstName: string | null; username: string | null; email: string | null };
  }>;
  openInviteCount: number;
  counts: {
    transactions: number;
    categories: number;
    aiUsage: number;
  };
};

export type AdminCoupleDetailResponse = {
  couple: {
    id: string;
    name: string;
    createdAt: string;
    members: Array<{
      role: string;
      createdAt: string;
      user: { id: string; firstName: string | null; username: string | null; email: string | null };
    }>;
    binds: Array<{
      id: string;
      insertedCode: string;
      userCoupleCode: string;
      updatedAt: string;
      user: { id: string; firstName: string | null; username: string | null; email: string | null };
    }>;
    invites: Array<{
      id: string;
      code: string;
      expiresAt: string;
      consumedAt: string | null;
      createdAt: string;
    }>;
  };
  categorySummary: Array<{
    scope: string;
    kind: string;
    count: number;
  }>;
  recentTransactions: Array<{
    id: string;
    kind: string;
    amount: number;
    amountInUzs: number;
    currency: string;
    note: string | null;
    happenedAt: string;
    category: { id: string; name: string; kind: string };
    user: { id: string; firstName: string | null; username: string | null; email: string | null };
  }>;
  recentAiUsage: Array<{
    id: string;
    model: string;
    operation: string;
    status: string;
    totalTokens: number;
    totalCostMicros: number;
    createdAt: string;
    user: { id: string; firstName: string | null; username: string | null; email: string | null } | null;
  }>;
};

export type AdminTransactionListItem = {
  id: string;
  kind: string;
  amount: number;
  amountInUzs: number;
  currency: string;
  exchangeRate: number;
  note: string | null;
  happenedAt: string;
  createdAt: string;
  category: { id: string; name: string; kind: string };
  user: { id: string; firstName: string | null; username: string | null; email: string | null };
  couple: { id: string; name: string };
};

export type AdminTransactionDetailResponse = {
  transaction: AdminTransactionListItem & {
    updatedAt: string;
  };
  availableCategories: Array<{
    id: string;
    name: string;
    scope: string;
  }>;
};

export type AdminCategoryListItem = {
  id: string;
  name: string;
  kind: string;
  scope: string;
  isVisible: boolean;
  createdAt: string;
  couple: { id: string; name: string };
  ownerUser: { id: string; firstName: string | null; username: string | null; email: string | null } | null;
  parentCategory: { id: string; name: string } | null;
  childCount: number;
  transactionCount: number;
};

export type AdminCategoryDetailResponse = {
  category: {
    id: string;
    name: string;
    kind: string;
    scope: string;
    isVisible: boolean;
    createdAt: string;
    couple: { id: string; name: string };
    ownerUser: { id: string; firstName: string | null; username: string | null; email: string | null } | null;
    parentCategory: { id: string; name: string } | null;
    children: Array<{ id: string; name: string; isVisible: boolean }>;
  };
  usage: {
    transactionCount: number;
    totalAmountInUzs: number;
  };
  availableParents: Array<{
    id: string;
    name: string;
    scope: string;
    ownerUserId: string | null;
  }>;
};

export type AdminSecurityResponse = {
  admins: Array<{
    email: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  stats: {
    totalAdmins: number;
    failedLogins: number;
  };
  recentAudit: Array<{
    id: string;
    adminEmail: string | null;
    actionType: string;
    outcome: string;
    createdAt: string;
    errorMessage: string | null;
    targetId: string | null;
  }>;
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

export type AdminAiUsageListResponse = AdminPaginated<{
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
  user: { id: string; firstName: string | null; username: string | null; email: string | null } | null;
  couple: { id: string; name: string } | null;
}>;

export type AdminAiPricingListItem = {
  id: string;
  provider: string;
  model: string;
  textInputMicrosPer1m: number;
  audioInputMicrosPer1m: number;
  textOutputMicrosPer1m: number;
  audioOutputMicrosPer1m: number;
  notes: string | null;
  effectiveFrom: string;
  retiredAt: string | null;
  createdByAdminEmail: string | null;
  createdAt: string;
};

export type AdminAiPricingListResponse = AdminPaginated<AdminAiPricingListItem> & {
  currentByModel: AdminAiPricingListItem[];
};

export type AdminAuditListResponse = AdminPaginated<{
  id: string;
  adminEmail: string | null;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  requestMetadata: unknown;
  beforeState: unknown;
  afterState: unknown;
  outcome: string;
  errorMessage: string | null;
  createdAt: string;
}>;

export type AdminSqlExecuteResponse = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  durationMs: number;
  truncated: boolean;
  error: string | null;
};
