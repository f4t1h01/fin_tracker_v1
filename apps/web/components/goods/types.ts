export type GoodsScope = "PERSONAL" | "SHARED";
export type GoodsAdvisorScope = GoodsScope | "AUTO";
export type GoodsConsumptionUnit = "HOUR" | "DAY" | "WEEK" | "PERMANENT";
export type GoodsStockStatus = "FULL" | "ENOUGH" | "LOW" | "OUT_OF_STOCK";
export type GoodsExpirationStatus = "FRESH" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";

export type GoodsCatalogPlace = {
  id: string;
  scope: GoodsScope;
  name: string;
  sortOrder: number;
  isVisible: boolean;
};

export type GoodsCatalogCategory = {
  id: string;
  scope: GoodsScope;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  isSeeded?: boolean;
};

export type GoodsUom = {
  id: string;
  code: string;
  label: string;
  groupKey: "COUNT" | "MASS" | "VOLUME" | "OTHER";
  decimals: number;
  isActive: boolean;
};

export type GoodsItem = {
  id: string;
  scope: GoodsScope;
  name: string;
  note: string | null;
  place: { id: string; name: string; scope: GoodsScope; isVisible: boolean } | null;
  category: { id: string; name: string; scope: GoodsScope; isVisible: boolean } | null;
  uom: GoodsUom | null;
  quantityBase: number;
  effectiveQuantity: number;
  lowStockThreshold: number;
  targetQuantity: number;
  consumptionRateValue: number | null;
  consumptionRateUnit: GoodsConsumptionUnit;
  consumptionRatePerHour: number | null;
  consumptionStartedAt: string | null;
  expirationDate: string | null;
  expirationStatus: GoodsExpirationStatus;
  daysUntilExpiry: number | null;
  stockStatus: GoodsStockStatus;
  estimatedRunOutAt: string | null;
  isArchived: boolean;
  lastStockEventAt: string;
  lastManualEventAt: string | null;
  updatedAt: string;
  latestEvent: {
    id: string;
    eventType: string;
    occurredAt: string;
    quantityDelta: number;
    quantityAfter: number;
    reason: string | null;
    source: string;
  } | null;
};

export type GoodsEvent = {
  id: string;
  eventType: string;
  quantityDelta: number;
  quantityAfter: number;
  occurredAt: string;
  source: string;
  reason: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string | null;
    username: string | null;
  } | null;
};

export type GoodsSnapshotResponse = {
  workspace: {
    coupleId: string;
    name: string;
    hasPartnerConnection: boolean;
  };
  metrics: {
    activeItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    expiringSoonItems: number;
    expiredItems: number;
    recentlyUpdatedItems: number;
  };
  highlights: {
    attentionItems: GoodsItem[];
    runOutSoon: GoodsItem[];
    recentChanges: Array<GoodsEvent & { item: { id: string; name: string } }>;
  };
  breakdown: {
    byPlace: Array<GoodsCatalogPlace & { itemCount: number; lowCount: number; outCount: number; expiringCount: number }>;
    byCategory: Array<GoodsCatalogCategory & { itemCount: number; lowCount: number; outCount: number; expiringCount: number }>;
  };
  catalog: {
    places: GoodsCatalogPlace[];
    categories: GoodsCatalogCategory[];
    uoms: GoodsUom[];
  };
};

export type GoodsListResponse = {
  items: GoodsItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  filter: {
    placeId?: string;
    categoryId?: string;
    scope?: GoodsScope;
    stockStatus?: GoodsStockStatus;
    expirationStatus?: GoodsExpirationStatus;
    lowOnly?: boolean;
    recentlyUpdatedOnly?: boolean;
    autoConsumptionOnly?: boolean;
    search?: string;
    sort: string;
  };
};

export type GoodsHistoryResponse = {
  items: GoodsEvent[];
};

export type GoodsManagePlace = GoodsCatalogPlace & {
  itemCount: number;
};

export type GoodsManageCategory = GoodsCatalogCategory & {
  itemCount: number;
};

export type GoodsManagePlacesResponse = {
  items: GoodsManagePlace[];
};

export type GoodsManageCategoriesResponse = {
  items: GoodsManageCategory[];
};

export type GoodsRecipePreview = {
  label: string;
  url: string;
  sourceType: "youtube_search" | "image_search";
  sourceLabel: string;
};

export type GoodsDinnerRecipeSuggestion = {
  title: string;
  whyItFits: string;
  usesItems: string[];
  assumedStaples: string[];
  missingItems: string[];
  steps: string[];
  confidence: number;
  wasteReductionNotes: string[];
  recipePreview: GoodsRecipePreview | null;
};

export type GoodsDinnerAdvisorResponse = {
  assistantMessage: string;
  pantryMeals: [GoodsDinnerRecipeSuggestion, GoodsDinnerRecipeSuggestion];
  minimalBuyMeal: GoodsDinnerRecipeSuggestion;
  warnings: string[];
};

export type GoodsAdvisorChatEntry = {
  id: string;
  prompt: string;
  response: GoodsDinnerAdvisorResponse | null;
};
