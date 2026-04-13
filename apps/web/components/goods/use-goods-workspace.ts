"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { webEnv } from "@/lib/env";
import { parseApiResponse } from "@/components/profile/api";
import { authSourceKey, tokenKey } from "@/components/profile/types";

import type {
  GoodsConsumptionUnit,
  GoodsHistoryResponse,
  GoodsItem,
  GoodsListResponse,
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

export function useGoodsWorkspace(options?: UseGoodsWorkspaceOptions) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GoodsSnapshotResponse | null>(null);
  const [listData, setListData] = useState<GoodsListResponse | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [historyByItemId, setHistoryByItemId] = useState<Record<string, GoodsHistoryResponse["items"]>>({});
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
      setCreateItemForm((current) => ({
        ...current,
        scope: nextSnapshot.workspace.hasPartnerConnection ? current.scope : "PERSONAL",
        placeId: current.placeId || nextSnapshot.catalog.places[0]?.id || "",
        categoryId: current.categoryId || nextSnapshot.catalog.categories.find((item) => item.scope === current.scope)?.id || nextSnapshot.catalog.categories[0]?.id || "",
        uomId: current.uomId || nextSnapshot.catalog.uoms[0]?.id || ""
      }));
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
  }, [refreshSnapshot, token]);

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
        await refreshList();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Request failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [refreshList, refreshSnapshot]
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
  }, [apiFetch, createItemForm, runMutation]);

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

  const filteredCategoryOptions = useMemo(() => {
    const activeScope = createItemForm.scope;
    return snapshot?.catalog.categories.filter((item) => item.scope === activeScope) ?? [];
  }, [createItemForm.scope, snapshot?.catalog.categories]);

  return {
    token,
    isReady,
    error,
    snapshot,
    listData,
    isLoadingSnapshot,
    isLoadingList,
    isSubmitting,
    statusMessage,
    historyByItemId,
    listFilters,
    setListFilters,
    createItemForm,
    setCreateItemForm,
    filteredCategoryOptions,
    placeScope,
    setPlaceScope,
    placeName,
    setPlaceName,
    categoryScope,
    setCategoryScope,
    categoryName,
    setCategoryName,
    refreshSnapshot,
    refreshList,
    loadHistory,
    onCreatePlace,
    onCreateCategory,
    onCreateItem,
    onRestockItem: (itemId: string, quantity: number, reason?: string) => onStockMutation(itemId, "restock", quantity, reason),
    onConsumeItem: (itemId: string, quantity: number, reason?: string) => onStockMutation(itemId, "consume", quantity, reason),
    onReconcileItem: (itemId: string, quantity: number, reason?: string) => onStockMutation(itemId, "reconcile", quantity, reason),
    onMoveItem,
    onUpdateItem,
    onArchiveItem
  };
}
