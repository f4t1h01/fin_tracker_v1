"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { parseApiResponse } from "@/components/profile/api";
import {
  clearDashboardCache,
  clearDashboardDisplayCurrencyCache,
  clearProfileSnapshotCache
} from "@/components/profile/cache";
import {
  tokenKey,
  type DashboardRatesResponse,
  type SupportedCurrency
} from "@/components/profile/types";
import { webEnv } from "@/lib/env";

const fallbackCurrencies: SupportedCurrency[] = ["UZS", "USD"];

function areSelectionsEqual(left: SupportedCurrency[], right: SupportedCurrency[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function useDashboardRatesWorkspace() {
  const [data, setData] = useState<DashboardRatesResponse | null>(null);
  const [draftCurrencies, setDraftCurrencies] = useState<SupportedCurrency[]>(fallbackCurrencies);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleInvalidToken = useCallback(() => {
    localStorage.removeItem(tokenKey);
    clearDashboardCache();
    clearDashboardDisplayCurrencyCache();
    clearProfileSnapshotCache();
    window.location.replace("/profile/me");
  }, []);

  const updateDraftCurrencies = useCallback((nextCurrencies: SupportedCurrency[]) => {
    setDraftCurrencies(nextCurrencies);
    setError(null);
    setMessage(null);
  }, []);

  const loadRates = useCallback(async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      handleInvalidToken();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/dashboard/rates`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await parseApiResponse<DashboardRatesResponse>(response);
      setData(payload);
      setDraftCurrencies(payload.selectedCurrencies);
      setError(null);
      setMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load exchange rates";
      if (message === "Invalid token" || message === "Missing bearer token") {
        handleInvalidToken();
        return;
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleInvalidToken]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const isDirty = useMemo(() => {
    if (!data) {
      return false;
    }

    return !areSelectionsEqual(draftCurrencies, data.selectedCurrencies);
  }, [data, draftCurrencies]);

  const saveSelection = useCallback(async () => {
    if (!data) {
      return;
    }

    const token = localStorage.getItem(tokenKey);
    if (!token) {
      handleInvalidToken();
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/dashboard/rates`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedCurrencies: draftCurrencies
        })
      });

      const payload = await parseApiResponse<DashboardRatesResponse>(response);
      setData(payload);
      setDraftCurrencies(payload.selectedCurrencies);
      setMessage("Exchange rates updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update exchange rates";
      if (message === "Invalid token" || message === "Missing bearer token") {
        handleInvalidToken();
        return;
      }

      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [data, draftCurrencies, handleInvalidToken]);

  return {
    data,
    draftCurrencies,
    error,
    isDirty,
    isLoading,
    isSaving,
    message,
    saveSelection,
    updateDraftCurrencies
  };
}
