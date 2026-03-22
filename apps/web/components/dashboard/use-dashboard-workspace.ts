"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { parseApiResponse } from "@/components/profile/api";
import {
  clearDashboardCache,
  clearDashboardDisplayCurrencyCache,
  clearProfileSnapshotCache,
  readDashboardCache,
  readDashboardDisplayCurrencyCache,
  writeDashboardCache,
  writeDashboardDisplayCurrencyCache
} from "@/components/profile/cache";
import { tokenKey, type DashboardActor, type DashboardKind, type DashboardRangePreset, type DashboardResponse, type DashboardViewMode, type EditableTransaction, type RecentTransaction, type SupportedCurrency } from "@/components/profile/types";
import { webEnv } from "@/lib/env";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

function buildDashboardQuery(params: {
  viewMode: DashboardViewMode;
  page: number;
  pageSize: number;
  selectedPreset: DashboardRangePreset;
  draftFrom: string;
  draftTo: string;
  draftMonthKey: string;
  kind: DashboardKind;
  categoryId: string;
  actor: DashboardActor;
  search: string;
  timeFrom: string;
  timeTo: string;
}) {
  const query = new URLSearchParams({
    viewMode: params.viewMode,
    page: String(params.page),
    pageSize: String(params.pageSize),
    rangePreset: params.selectedPreset
  });

  if (params.selectedPreset === "CUSTOM") {
    query.set("from", params.draftFrom);
    query.set("to", params.draftTo);
  }

  if (params.selectedPreset === "SPECIFIC_MONTH" && params.draftMonthKey) {
    query.set("monthKey", params.draftMonthKey);
  }

  if (params.kind !== "ALL") {
    query.set("kind", params.kind);
  }

  if (params.categoryId) {
    query.set("categoryId", params.categoryId);
  }

  if (params.actor !== "EVERYONE") {
    query.set("actor", params.actor);
  }

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.timeFrom) {
    query.set("timeFrom", params.timeFrom);
  }

  if (params.timeTo) {
    query.set("timeTo", params.timeTo);
  }

  return query;
}

type DashboardWorkspaceMode = "overview" | "trends";

export function useDashboardWorkspace(mode: DashboardWorkspaceMode = "overview") {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("UZS");
  const [viewMode, setViewMode] = useState<DashboardViewMode>("COUPLE");
  const [selectedPreset, setSelectedPreset] = useState<DashboardRangePreset>("THIS_WEEK");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftMonthKey, setDraftMonthKey] = useState("");
  const [kind, setKind] = useState<DashboardKind>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [actor, setActor] = useState<DashboardActor>("EVERYONE");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditableTransaction | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  useClientLayoutEffect(() => {
    const cached = readDashboardCache();
    if (!cached || !("transactions" in cached) || !("charts" in cached) || !("filters" in cached)) {
      const cachedCurrency = readDashboardDisplayCurrencyCache();
      if (cachedCurrency) {
        setDisplayCurrency(cachedCurrency);
      }
      return;
    }

    const hasAdvancedFilters = Boolean(
      cached.filter.kind !== "ALL" || cached.filter.categoryId || cached.filter.actor !== "EVERYONE" || cached.filter.timeFrom || cached.filter.timeTo
    );

    if (!(mode === "overview" && hasAdvancedFilters)) {
      setData(cached);
    }
    setDisplayCurrency(readDashboardDisplayCurrencyCache() ?? "UZS");
    setViewMode(cached.filter.viewMode ?? "COUPLE");
    setSelectedPreset(cached.filter.preset);
    setDraftFrom(cached.filter.from ?? "");
    setDraftTo(cached.filter.to ?? "");
    setDraftMonthKey(cached.filter.monthKey ?? "");
    setKind(mode === "overview" ? "ALL" : cached.filter.kind ?? "ALL");
    setCategoryId(mode === "overview" ? "" : cached.filter.categoryId ?? "");
    setActor(mode === "overview" ? "EVERYONE" : cached.filter.actor ?? "EVERYONE");
    setSearchDraft(cached.filter.search ?? "");
    setSearch(cached.filter.search ?? "");
    setTimeFrom(mode === "overview" ? "" : cached.filter.timeFrom ?? "");
    setTimeTo(mode === "overview" ? "" : cached.filter.timeTo ?? "");
    setPage(cached.filter.page ?? 1);
    setPageSize(cached.filter.pageSize ?? 20);
  }, [mode]);

  useEffect(() => {
    writeDashboardDisplayCurrencyCache(displayCurrency);
  }, [displayCurrency]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchDraft.trim();
      if (nextSearch === search) {
        return;
      }

      setSearch(nextSearch);
      setPage(1);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [searchDraft, search]);

  const fetchDashboard = useCallback(async () => {
    if ((selectedPreset === "CUSTOM" && (!draftFrom || !draftTo)) || (selectedPreset === "SPECIFIC_MONTH" && !draftMonthKey)) {
      return;
    }

    const token = localStorage.getItem(tokenKey);
    if (!token) {
      window.location.replace("/profile/me");
      return;
    }

    const query = buildDashboardQuery({
      viewMode,
      page,
      pageSize,
      selectedPreset,
      draftFrom,
      draftTo,
      draftMonthKey,
      kind,
      categoryId,
      actor,
      search,
      timeFrom,
      timeTo
    });

    setIsRefreshing(true);
    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/dashboard?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await parseApiResponse<DashboardResponse>(response);
      writeDashboardCache(payload);
      setData(payload);
      setError(null);
      setViewMode(payload.filter.viewMode);
      setSelectedPreset(payload.filter.preset);
      setDraftFrom(payload.filter.from ?? "");
      setDraftTo(payload.filter.to ?? "");
      setDraftMonthKey(payload.filter.monthKey ?? "");
      setKind(mode === "overview" ? "ALL" : payload.filter.kind);
      setCategoryId(mode === "overview" ? "" : payload.filter.categoryId ?? "");
      setActor(mode === "overview" ? "EVERYONE" : payload.filter.actor);
      setSearchDraft(payload.filter.search);
      setSearch(payload.filter.search);
      setTimeFrom(mode === "overview" ? "" : payload.filter.timeFrom ?? "");
      setTimeTo(mode === "overview" ? "" : payload.filter.timeTo ?? "");
      setPage(payload.filter.page);
      setPageSize(payload.filter.pageSize);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load dashboard";
      if (message === "Invalid token" || message === "Missing bearer token") {
        localStorage.removeItem(tokenKey);
        clearDashboardCache();
        clearDashboardDisplayCurrencyCache();
        clearProfileSnapshotCache();
        window.location.replace("/profile/me");
        return;
      }

      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    actor,
    categoryId,
    draftFrom,
    draftMonthKey,
    draftTo,
    kind,
    mode,
    page,
    pageSize,
    search,
    selectedPreset,
    timeFrom,
    timeTo,
    viewMode
  ]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const summary = useMemo(() => {
    if (!data) {
      return null;
    }

    const rate = data.rates[displayCurrency];
    const income = viewMode === "PERSONAL" ? data.summary.personalIncome : data.summary.totalIncome;
    const expense = viewMode === "PERSONAL" ? data.summary.personalExpense : data.summary.totalExpense;
    const balance = viewMode === "PERSONAL" ? data.summary.personalBalance : data.summary.balance;

    return {
      totalIncome: convertAmount(income, rate),
      totalExpense: convertAmount(expense, rate),
      balance: convertAmount(balance, rate)
    };
  }, [data, displayCurrency, viewMode]);

  const startEditing = (item: RecentTransaction) => {
    setTxMessage(null);
    setTxError(null);
    setEditingTransaction({
      id: item.id,
      amount: String(item.amount),
      kind: item.kind,
      currency: item.currency,
      categoryId: item.category.id,
      categoryName: item.category.name,
      note: item.note ?? ""
    });
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = localStorage.getItem(tokenKey);
    if (!token || !editingTransaction) {
      return;
    }

    setTxError(null);
    setTxMessage(null);
    setIsSavingEdit(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/transactions/${editingTransaction.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(editingTransaction.amount),
          kind: editingTransaction.kind,
          currency: editingTransaction.currency,
          categoryId: editingTransaction.categoryId,
          categoryName: editingTransaction.categoryName,
          note: editingTransaction.note || undefined
        })
      });

      await parseApiResponse<unknown>(response);
      setEditingTransaction(null);
      setTxMessage("Transaction updated.");
      await fetchDashboard();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Could not update transaction");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDeleteTransaction = async (transactionId: string) => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      return;
    }

    setTxError(null);
    setTxMessage(null);
    setIsDeletingId(transactionId);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/transactions/${transactionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await parseApiResponse<unknown>(response);
      if (editingTransaction?.id === transactionId) {
        setEditingTransaction(null);
      }
      setTxMessage("Transaction deleted.");
      await fetchDashboard();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Could not delete transaction");
    } finally {
      setIsDeletingId(null);
    }
  };

  const workspaceName = data?.profile.activeCouple?.name ?? "Personal workspace";

  return {
    data,
    error,
    isRefreshing,
    displayCurrency,
    setDisplayCurrency,
    viewMode,
    setViewMode,
    selectedPreset,
    setSelectedPreset,
    draftFrom,
    setDraftFrom,
    draftTo,
    setDraftTo,
    draftMonthKey,
    setDraftMonthKey,
    kind,
    setKind,
    categoryId,
    setCategoryId,
    actor,
    setActor,
    searchDraft,
    setSearchDraft,
    search,
    timeFrom,
    setTimeFrom,
    timeTo,
    setTimeTo,
    page,
    setPage,
    pageSize,
    setPageSize,
    summary,
    editingTransaction,
    setEditingTransaction,
    isSavingEdit,
    isDeletingId,
    startEditing,
    onSaveEdit,
    onDeleteTransaction,
    txMessage,
    txError,
    workspaceName
  };
}
