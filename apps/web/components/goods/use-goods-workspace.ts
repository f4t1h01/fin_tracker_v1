"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { webEnv } from "@/lib/env";
import { parseApiResponse } from "@/components/profile/api";
import { authSourceKey, tokenKey } from "@/components/profile/types";

import type {
  GoodsAdvisorChatEntry,
  GoodsAdvisorScope,
  GoodsConsumptionUnit,
  GoodsDinnerAdvisorResponse,
  GoodsHistoryResponse,
  GoodsItem,
  GoodsListResponse,
  GoodsManageCategoriesResponse,
  GoodsManagePlacesResponse,
  GoodsScope,
  GoodsSnapshotResponse
} from "./types";

type UseGoodsWorkspaceOptions = {
  loadList?: boolean;
};

type GoodsListFilters = {
  placeId: string;
  categoryId: string;
  scope: "" | GoodsScope;
  stockStatus: "" | "FULL" | "ENOUGH" | "LOW" | "OUT_OF_STOCK";
  expirationStatus: "" | "FRESH" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";
  lowOnly: boolean;
  recentlyUpdatedOnly: boolean;
  autoConsumptionOnly: boolean;
  search: string;
  sort: string;
  page: number;
};

type ScopedVisibleOption = {
  id: string;
  scope: GoodsScope;
  isVisible: boolean;
};

const defaultCreateItemForm = {
  scope: "PERSONAL" as GoodsScope,
  placeId: "",
  categoryId: "",
  uomId: "",
  name: "",
  quantity: "",
  lowStockThreshold: "",
  targetQuantity: "",
  note: "",
  expirationDate: "",
  consumptionRateValue: "",
  consumptionRateUnit: "PERMANENT" as GoodsConsumptionUnit
};

function createClientMessageId() {
  return `advisor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveVisibleScopedOptionId<T extends ScopedVisibleOption>(items: T[], scope: GoodsScope, currentId: string) {
  const scopedVisibleItems = items.filter((item) => item.scope === scope && item.isVisible);

  if (currentId && scopedVisibleItems.some((item) => item.id === currentId)) {
    return currentId;
  }

  return scopedVisibleItems[0]?.id ?? "";
}

function resolveUomId(snapshot: GoodsSnapshotResponse | null, currentId: string) {
  if (!snapshot) {
    return currentId;
  }

  if (currentId && snapshot.catalog.uoms.some((item) => item.id === currentId)) {
    return currentId;
  }

  return snapshot.catalog.uoms[0]?.id ?? "";
}

export function useGoodsWorkspace(options?: UseGoodsWorkspaceOptions) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GoodsSnapshotResponse | null>(null);
  const [placesData, setPlacesData] = useState<GoodsManagePlacesResponse | null>(null);
  const [categoriesData, setCategoriesData] = useState<GoodsManageCategoriesResponse | null>(null);
  const [listData, setListData] = useState<GoodsListResponse | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [historyByItemId, setHistoryByItemId] = useState<Record<string, GoodsHistoryResponse["items"]>>({});
  const [advisorChat, setAdvisorChat] = useState<GoodsAdvisorChatEntry[]>([]);
  const [advisorDraft, setAdvisorDraft] = useState("");
  const [advisorScope, setAdvisorScope] = useState<GoodsAdvisorScope>("AUTO");
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [isAdvisorSubmitting, setIsAdvisorSubmitting] = useState(false);
  const [listFilters, setListFilters] = useState<GoodsListFilters>({
    placeId: "",
    categoryId: "",
    scope: "",
    stockStatus: "",
    expirationStatus: "",
    lowOnly: false,
    recentlyUpdatedOnly: false,
    autoConsumptionOnly: false,
    search: "",
    sort: "RECENTLY_UPDATED",
    page: 1
  });

  const [createItemForm, setCreateItemForm] = useState(defaultCreateItemForm);
  const [placeScope, setPlaceScope] = useState<GoodsScope>("PERSONAL");
  const [placeName, setPlaceName] = useState("");
  const [categoryScope, setCategoryScope] = useState<GoodsScope>("PERSONAL");
  const [categoryName, setCategoryName] = useState("");

  const canCreateItem = Boolean(
    createItemForm.name.trim() &&
      createItemForm.quantity.trim() &&
      createItemForm.placeId &&
      createItemForm.categoryId &&
      createItemForm.uomId &&
      snapshot?.catalog.uoms.some((item) => item.id === createItemForm.uomId),
  );

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenKey);
    setToken(storedToken);
    setIsReady(true);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(tokenKey);
    window.localStorage.removeItem(authSourceKey);
    setToken(null);
  }, []);

  const apiFetch = useCallback(
    async <T>(path: string, init?: RequestInit) => {
      if (!token) {
        throw new Error("Missing bearer token");
      }

      const response = await fetch(`${webEnv.apiUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {})
        }
      });

      return parseApiResponse<T>(response);
    },
    [token]
  );

  const refreshSnapshot = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingSnapshot(true);
    setError(null);

    try {
      const nextSnapshot = await apiFetch<GoodsSnapshotResponse>("/profile/me/goods/snapshot");
      setSnapshot(nextSnapshot);
      setCreateItemForm((current) => {
        const nextScope = nextSnapshot.workspace.hasPartnerConnection ? current.scope : "PERSONAL";
        return {
          ...current,
          scope: nextScope,
          placeId: resolveVisibleScopedOptionId(nextSnapshot.catalog.places, nextScope, current.placeId),
          categoryId: resolveVisibleScopedOptionId(nextSnapshot.catalog.categories, nextScope, current.categoryId),
          uomId: resolveUomId(nextSnapshot, current.uomId)
        };
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not load goods snapshot";
      setError(message);
      if (message === "Invalid token" || message === "Missing bearer token") {
        clearSession();
      }
    } finally {
      setIsLoadingSnapshot(false);
    }
  }, [apiFetch, clearSession, token]);

  const refreshManagement = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const [nextPlaces, nextCategories] = await Promise.all([
        apiFetch<GoodsManagePlacesResponse>("/profile/me/goods/places"),
        apiFetch<GoodsManageCategoriesResponse>("/profile/me/goods/categories")
      ]);
      setPlacesData(nextPlaces);
      setCategoriesData(nextCategories);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not load goods setup";
      setError(message);
    }
  }, [apiFetch, token]);

  const refreshList = useCallback(async () => {
    if (!token || !options?.loadList) {
      return;
    }

    setIsLoadingList(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      Object.entries(listFilters).forEach(([key, value]) => {
        if (typeof value === "boolean") {
          if (value) {
            query.set(key, "true");
          }
          return;
        }

        if (!value) {
          return;
        }

        query.set(key, String(value));
      });

      const nextList = await apiFetch<GoodsListResponse>(`/profile/me/goods/items?${query.toString()}`);
      setListData(nextList);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not load goods inventory";
      setError(message);
    } finally {
      setIsLoadingList(false);
    }
  }, [apiFetch, listFilters, options?.loadList, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshSnapshot();
    void refreshManagement();
  }, [refreshManagement, refreshSnapshot, token]);

  useEffect(() => {
    if (!token || !options?.loadList) {
      return;
    }

    void refreshList();
  }, [options?.loadList, refreshList, token]);

  const runMutation = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setIsSubmitting(true);
      setError(null);
      setStatusMessage(null);

      try {
        await action();
        setStatusMessage(label);
        await refreshSnapshot();
        await refreshManagement();
        await refreshList();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Request failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [refreshList, refreshManagement, refreshSnapshot]
  );

  const loadHistory = useCallback(
    async (itemId: string) => {
      if (historyByItemId[itemId]) {
        return;
      }

      const payload = await apiFetch<GoodsHistoryResponse>(`/profile/me/goods/items/${itemId}/events`);
      setHistoryByItemId((current) => ({
        ...current,
        [itemId]: payload.items
      }));
    },
    [apiFetch, historyByItemId]
  );

  const onCreatePlace = useCallback(async () => {
    await runMutation("Place created.", async () => {
      await apiFetch("/profile/me/goods/places", {
        method: "POST",
        body: JSON.stringify({
          scope: placeScope,
          name: placeName
        })
      });
      setPlaceName("");
    });
  }, [apiFetch, placeName, placeScope, runMutation]);

  const onCreateCategory = useCallback(async () => {
    await runMutation("Category created.", async () => {
      await apiFetch("/profile/me/goods/categories", {
        method: "POST",
        body: JSON.stringify({
          scope: categoryScope,
          name: categoryName
        })
      });
      setCategoryName("");
    });
  }, [apiFetch, categoryName, categoryScope, runMutation]);

  const onCreateItem = useCallback(async () => {
    if (!snapshot?.catalog.uoms.some((item) => item.id === createItemForm.uomId)) {
      setError("Choose a valid unit of measure before saving.");
      return;
    }

    await runMutation("Goods item added.", async () => {
      await apiFetch("/profile/me/goods/items", {
        method: "POST",
        body: JSON.stringify({
          ...createItemForm,
          quantity: Number(createItemForm.quantity),
          lowStockThreshold: createItemForm.lowStockThreshold ? Number(createItemForm.lowStockThreshold) : undefined,
          targetQuantity: createItemForm.targetQuantity ? Number(createItemForm.targetQuantity) : undefined,
          consumptionRateValue: createItemForm.consumptionRateValue ? Number(createItemForm.consumptionRateValue) : undefined
        })
      });
      setCreateItemForm((current) => ({
        ...defaultCreateItemForm,
        scope: current.scope,
        placeId: current.placeId,
        categoryId: current.categoryId,
        uomId: current.uomId
      }));
    });
  }, [apiFetch, createItemForm, runMutation, snapshot?.catalog.uoms]);

  const onStockMutation = useCallback(
    async (itemId: string, path: string, quantity: number, reason?: string) => {
      await runMutation("Item updated.", async () => {
        await apiFetch(`/profile/me/goods/items/${itemId}/${path}`, {
          method: "POST",
          body: JSON.stringify({ quantity, reason })
        });
        setHistoryByItemId((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onMoveItem = useCallback(
    async (itemId: string, placeId: string, categoryId: string, reason?: string) => {
      await runMutation("Item moved.", async () => {
        await apiFetch(`/profile/me/goods/items/${itemId}/move`, {
          method: "POST",
          body: JSON.stringify({ placeId, categoryId, reason })
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onUpdateItem = useCallback(
    async (itemId: string, payload: Record<string, unknown>) => {
      await runMutation("Item settings saved.", async () => {
        await apiFetch(`/profile/me/goods/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onArchiveItem = useCallback(
    async (itemId: string) => {
      await runMutation("Item archived.", async () => {
        await apiFetch(`/profile/me/goods/items/${itemId}/archive`, {
          method: "POST",
          body: JSON.stringify({})
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onTogglePlaceVisibility = useCallback(
    async (placeId: string, isVisible: boolean) => {
      await runMutation(isVisible ? "Place shown." : "Place hidden.", async () => {
        await apiFetch(`/profile/me/goods/places/${placeId}/visibility`, {
          method: "PATCH",
          body: JSON.stringify({ isVisible })
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onDeletePlace = useCallback(
    async (placeId: string) => {
      await runMutation("Place deleted.", async () => {
        await apiFetch(`/profile/me/goods/places/${placeId}`, {
          method: "DELETE"
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onToggleCategoryVisibility = useCallback(
    async (categoryId: string, isVisible: boolean) => {
      await runMutation(isVisible ? "Category shown." : "Category hidden.", async () => {
        await apiFetch(`/profile/me/goods/categories/${categoryId}/visibility`, {
          method: "PATCH",
          body: JSON.stringify({ isVisible })
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onDeleteCategory = useCallback(
    async (categoryId: string) => {
      await runMutation("Category deleted.", async () => {
        await apiFetch(`/profile/me/goods/categories/${categoryId}`, {
          method: "DELETE"
        });
      });
    },
    [apiFetch, runMutation]
  );

  const onCreateItemScopeChange = useCallback(
    (scope: GoodsScope) => {
      setCreateItemForm((current) => ({
        ...current,
        scope,
        placeId: resolveVisibleScopedOptionId(snapshot?.catalog.places ?? [], scope, current.placeId),
        categoryId: resolveVisibleScopedOptionId(snapshot?.catalog.categories ?? [], scope, current.categoryId)
      }));
    },
    [snapshot]
  );

  const onAskDinnerAdvisor = useCallback(
    async (overrideMessage?: string) => {
      const prompt = (overrideMessage ?? advisorDraft).trim();
      if (!prompt) {
        setAdvisorError("Enter a dinner question first.");
        return;
      }

      const nextId = createClientMessageId();
      setAdvisorError(null);
      setIsAdvisorSubmitting(true);
      setAdvisorChat((current) => [...current, { id: nextId, prompt, response: null }]);

      try {
        const payload = await apiFetch<GoodsDinnerAdvisorResponse>("/profile/me/goods/advisor/dinner", {
          method: "POST",
          body: JSON.stringify({
            message: prompt,
            scope: advisorScope
          })
        });

        setAdvisorChat((current) =>
          current.map((entry) => (entry.id === nextId ? { ...entry, response: payload } : entry))
        );
        if (overrideMessage === undefined) {
          setAdvisorDraft("");
        }
      } catch (reason) {
        setAdvisorChat((current) => current.filter((entry) => entry.id !== nextId));
        setAdvisorError(reason instanceof Error ? reason.message : "Could not get dinner advice");
      } finally {
        setIsAdvisorSubmitting(false);
      }
    },
    [advisorDraft, advisorScope, apiFetch]
  );

  const visiblePlaceOptions = useMemo(() => {
    const activeScope = createItemForm.scope;
    return snapshot?.catalog.places.filter((item) => item.scope === activeScope && item.isVisible) ?? [];
  }, [createItemForm.scope, snapshot?.catalog.places]);

  const visibleCategoryOptions = useMemo(() => {
    const activeScope = createItemForm.scope;
    return snapshot?.catalog.categories.filter((item) => item.scope === activeScope && item.isVisible) ?? [];
  }, [createItemForm.scope, snapshot?.catalog.categories]);

  return {
    token,
    isReady,
    error,
    snapshot,
    placesData,
    categoriesData,
    listData,
    isLoadingSnapshot,
    isLoadingList,
    isSubmitting,
    statusMessage,
    historyByItemId,
    advisorChat,
    advisorDraft,
    setAdvisorDraft,
    advisorScope,
    setAdvisorScope,
    advisorError,
    isAdvisorSubmitting,
    listFilters,
    setListFilters,
    createItemForm,
    setCreateItemForm,
    visiblePlaceOptions,
    visibleCategoryOptions,
    placeScope,
    setPlaceScope,
    placeName,
    setPlaceName,
    categoryScope,
    setCategoryScope,
    categoryName,
    setCategoryName,
    canCreateItem,
    refreshSnapshot,
    refreshManagement,
    refreshList,
    loadHistory,
    onCreatePlace,
    onCreateCategory,
    onCreateItem,
    onCreateItemScopeChange,
    onAskDinnerAdvisor,
    onRestockItem: (itemId: string, quantity: number, reason?: string) => onStockMutation(itemId, "restock", quantity, reason),
    onConsumeItem: (itemId: string, quantity: number, reason?: string) => onStockMutation(itemId, "consume", quantity, reason),
    onReconcileItem: (itemId: string, quantity: number, reason?: string) => onStockMutation(itemId, "reconcile", quantity, reason),
    onMoveItem,
    onUpdateItem,
    onArchiveItem,
    onTogglePlaceVisibility,
    onDeletePlace,
    onToggleCategoryVisibility,
    onDeleteCategory
  };
}
