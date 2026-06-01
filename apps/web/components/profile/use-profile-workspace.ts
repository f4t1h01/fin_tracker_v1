"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { webEnv } from "@/lib/env";
import { persistTheme, type ThemeMode, themeStorageKey } from "@/lib/theme";
import { syncAuthenticatedThemePreference } from "@/lib/theme-preference";

import { parseTransactionAmount } from "./amount-format";
import { findCategoryOptionById } from "./category-options";
import { parseApiResponse } from "./api";
import {
  clearDashboardCache,
  clearDashboardDisplayCurrencyCache,
  clearDashboardRateCurrenciesCache,
  clearProfileSnapshotCache,
  clampDashboardRateCurrency,
  dashboardRateCurrenciesUpdatedEvent,
  normalizeDashboardRateCurrencies,
  readDashboardRateCurrenciesCache,
  readProfileSnapshotCache,
  writeDashboardRateCurrenciesCache,
  writeProfileSnapshotCache
} from "./cache";
import { getTashkentGreeting } from "./greeting";
import { clearPendingTelegramContext, detectTelegramContextFromWindow, readPendingTelegramContext, writePendingTelegramContext, type PendingTelegramContext } from "./telegram-context";
import {
  authSourceKey,
  canonicalProfilePath,
  type AuthMeResponse,
  type CategoryCatalogResponse,
  type CategoryScope,
  type EditableTransaction,
  type ProfileResponse,
  type ProfileSnapshotResponse,
  type RecentTransaction,
  supportedCurrencies,
  tokenKey,
  type SupportedCurrency,
  type MonthlySummary,
  type WeekStartDay
} from "./types";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

type UseProfileWorkspaceOptions = {
  routePath?: string;
};

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function normalizeMonthlySummary(summary: Partial<MonthlySummary> | null | undefined): MonthlySummary {
  const today = new Date();
  const month = Number(summary?.month);
  const year = Number(summary?.year);
  const totalIncome = Number(summary?.totalIncome ?? 0);
  const totalExpense = Number(summary?.totalExpense ?? 0);
  const balance = Number.isFinite(Number(summary?.balance)) ? Number(summary?.balance) : totalIncome - totalExpense;
  const personalIncome = Number(summary?.personalIncome ?? 0);
  const personalExpense = Number(summary?.personalExpense ?? 0);

  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : today.getMonth() + 1,
    year: Number.isInteger(year) && year >= 2000 ? year : today.getFullYear(),
    currency: summary?.currency && supportedCurrencies.includes(summary.currency) ? summary.currency : "UZS",
    totalIncome,
    totalExpense,
    balance,
    personalIncome,
    personalExpense,
    personalBalance: Number.isFinite(Number(summary?.personalBalance)) ? Number(summary?.personalBalance) : personalIncome - personalExpense
  };
}

export function useProfileWorkspace(options?: UseProfileWorkspaceOptions) {
  const routePath = options?.routePath ?? canonicalProfilePath;
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null);

  const [detailsFirstName, setDetailsFirstName] = useState("");
  const [detailsLastName, setDetailsLastName] = useState("");
  const [detailsBirthday, setDetailsBirthday] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartDay>("MONDAY");
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordMessage, setChangePasswordMessage] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryCatalogResponse | null>(null);
  const [preferredCurrencies, setPreferredCurrencies] = useState<SupportedCurrency[]>(() => readDashboardRateCurrenciesCache());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showSharedCategoriesInPicker, setShowSharedCategoriesInPicker] = useState(true);
  const [defaultIncomeCategoryId, setDefaultIncomeCategoryId] = useState("");
  const [defaultExpenseCategoryId, setDefaultExpenseCategoryId] = useState("");
  const [isSavingCategoryPreferences, setIsSavingCategoryPreferences] = useState(false);
  const [categoryPreferencesMessage, setCategoryPreferencesMessage] = useState<string | null>(null);
  const [categoryPreferencesError, setCategoryPreferencesError] = useState<string | null>(null);
  const [categoryFormKind, setCategoryFormKind] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [categoryFormScope, setCategoryFormScope] = useState<CategoryScope>("PERSONAL");
  const [categoryFormName, setCategoryFormName] = useState("");
  const [categoryFormParentId, setCategoryFormParentId] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isDeletingCategoryId, setIsDeletingCategoryId] = useState<string | null>(null);
  const [isUpdatingCategoryVisibilityId, setIsUpdatingCategoryVisibilityId] = useState<string | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [bindCode, setBindCode] = useState("");
  const [bindMessage, setBindMessage] = useState<string | null>(null);
  const [bindError, setBindError] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [telegramConnectUrl, setTelegramConnectUrl] = useState(webEnv.botName ? `https://t.me/${webEnv.botName}` : "https://t.me/coup_fin_trackerbot");

  const [kind, setKind] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>(() => readDashboardRateCurrenciesCache()[0] ?? "UZS");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditableTransaction | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  const updatePreferredCurrencies = useCallback((value?: readonly string[] | null) => {
    const nextPreferredCurrencies = normalizeDashboardRateCurrencies(value);
    writeDashboardRateCurrenciesCache(nextPreferredCurrencies);
    setPreferredCurrencies(nextPreferredCurrencies);
    setCurrency((current) => clampDashboardRateCurrency(current, nextPreferredCurrencies));
    setEditingTransaction((current) =>
      current ? { ...current, currency: clampDashboardRateCurrency(current.currency, nextPreferredCurrencies) } : current
    );
    return nextPreferredCurrencies;
  }, []);

  const applySnapshot = useCallback((snapshot: ProfileSnapshotResponse) => {
    const normalizedSnapshot: ProfileSnapshotResponse = {
      ...snapshot,
      summary: normalizeMonthlySummary(snapshot.summary),
      categories:
        snapshot.categories ??
        ({
          preferences: {
            showSharedCategories: true,
            defaultIncomeCategoryId: null,
            defaultExpenseCategoryId: null
          },
          byKind: {
            EXPENSE: { personal: [], shared: [] },
            INCOME: { personal: [], shared: [] }
          }
        } satisfies CategoryCatalogResponse)
    };

    const nextPreferredCurrencies = updatePreferredCurrencies(normalizedSnapshot.profile.dashboardRateCurrencies);
    normalizedSnapshot.profile.dashboardRateCurrencies = nextPreferredCurrencies;

    writeProfileSnapshotCache(normalizedSnapshot);
    setProfile(normalizedSnapshot.profile);
    setSummary(normalizedSnapshot.summary);
    setRecent(normalizedSnapshot.recent);
    setAuthMe(normalizedSnapshot.auth);
    setCategoryCatalog(normalizedSnapshot.categories);
    setShowSharedCategoriesInPicker(normalizedSnapshot.categories.preferences.showSharedCategories);
    setDefaultIncomeCategoryId(normalizedSnapshot.categories.preferences.defaultIncomeCategoryId ?? "");
    setDefaultExpenseCategoryId(normalizedSnapshot.categories.preferences.defaultExpenseCategoryId ?? "");
    setDetailsFirstName(normalizedSnapshot.auth.firstName ?? "");
    setDetailsLastName(normalizedSnapshot.auth.lastName ?? "");
    setDetailsBirthday(normalizedSnapshot.auth.birthday?.slice(0, 10) ?? "");
    setWeekStartsOn(normalizedSnapshot.auth.weekStartsOn);

    if (normalizedSnapshot.auth.email) {
      setSetupEmail((current) => current || normalizedSnapshot.auth.email || "");
    }
  }, [updatePreferredCurrencies]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(authSourceKey);
    clearProfileSnapshotCache();
    clearDashboardCache();
    clearDashboardDisplayCurrencyCache();
    clearDashboardRateCurrenciesCache();
    clearPendingTelegramContext();
    const nextPreferredCurrencies = readDashboardRateCurrenciesCache();
    setToken(null);
    setAuthMe(null);
    setProfile(null);
    setSummary(null);
    setRecent([]);
    setDetailsFirstName("");
    setDetailsLastName("");
    setDetailsBirthday("");
    setWeekStartsOn("MONDAY");
    setTelegramConnectUrl(webEnv.botName ? `https://t.me/${webEnv.botName}` : "https://t.me/coup_fin_trackerbot");
    setCategoryCatalog(null);
    setShowSharedCategoriesInPicker(true);
    setDefaultIncomeCategoryId("");
    setDefaultExpenseCategoryId("");
    setSelectedCategoryId("");
    setPreferredCurrencies(nextPreferredCurrencies);
    setCurrency(nextPreferredCurrencies[0] ?? "UZS");
    setEditingTransaction(null);
  }, []);

  const ensureCanonicalProfileUrl = useCallback((targetPath = canonicalProfilePath) => {
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, "", targetPath);
    }
  }, []);

  const fetchSnapshot = useCallback(
    async (authToken: string) => {
      setIsLoadingData(true);
      setAuthError(null);

      try {
        const snapshot = await fetch(`${webEnv.apiUrl}/profile/me/snapshot?month=${today.getMonth() + 1}&year=${today.getFullYear()}`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }).then((response) => parseApiResponse<ProfileSnapshotResponse>(response));

        applySnapshot(snapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load profile data";
        if (message === "Invalid token" || message === "Missing bearer token") {
          clearSession();
        }
        setAuthError(message);
      } finally {
        setIsLoadingData(false);
      }
    },
    [applySnapshot, clearSession, today]
  );

  const authenticateTelegramContext = useCallback(
    async (context: PendingTelegramContext, authToken?: string) => {
      const response = await fetch(
        `${webEnv.apiUrl}/${context.kind === "telegram-webapp" ? "auth/telegram-webapp" : "auth/bot-webapp"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          },
          body:
            context.kind === "telegram-webapp"
              ? JSON.stringify({ initData: context.initData, linkToken: context.linkToken ?? undefined })
              : JSON.stringify({
                  telegramId: context.telegramId,
                  chatId: context.chatId,
                  timestamp: context.timestamp,
                  signature: context.signature,
                  linkToken: context.linkToken ?? undefined
                })
        }
      );

      const payload = await parseApiResponse<{ accessToken: string }>(response);
      clearPendingTelegramContext();
      return payload.accessToken;
    },
    []
  );

  const attachPendingTelegramContext = useCallback(
    async (authToken: string) => {
      const pending = readPendingTelegramContext() ?? detectTelegramContextFromWindow();
      if (!pending) {
        return authToken;
      }

      try {
        return await authenticateTelegramContext(pending, authToken);
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Could not link Telegram to this account");
        return authToken;
      }
    },
    [authenticateTelegramContext]
  );

  useClientLayoutEffect(() => {
    const existing = localStorage.getItem(tokenKey);
    const snapshot = readProfileSnapshotCache();
    const telegramContext = detectTelegramContextFromWindow();

    if (snapshot) {
      applySnapshot(snapshot);
    }

    if (existing) {
      setToken(existing);
    }

    if (telegramContext) {
      writePendingTelegramContext(telegramContext);
    }

    if (!telegramContext) {
      setIsAuthenticating(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    const listener = (event: Event) => {
      updatePreferredCurrencies((event as CustomEvent<SupportedCurrency[]>).detail);
    };

    window.addEventListener(dashboardRateCurrenciesUpdatedEvent, listener as EventListener);
    return () => window.removeEventListener(dashboardRateCurrenciesUpdatedEvent, listener as EventListener);
  }, [updatePreferredCurrencies]);

  useEffect(() => {
    const bootstrap = async () => {
      const telegramContext = detectTelegramContextFromWindow() ?? readPendingTelegramContext();

      ensureCanonicalProfileUrl(routePath);

      if (telegramContext?.kind === "telegram-webapp") {
        try {
          const telegramWebApp = window.Telegram?.WebApp;
          telegramWebApp?.ready?.();
          telegramWebApp?.expand?.();
          writePendingTelegramContext(telegramContext);
          const existingToken = localStorage.getItem(tokenKey);
          const accessToken = await authenticateTelegramContext(telegramContext, existingToken ?? undefined);
          localStorage.setItem(tokenKey, accessToken);
          localStorage.setItem(authSourceKey, "telegram");
          setToken(accessToken);
        } catch (error) {
          setAuthError(error instanceof Error ? error.message : "Could not sign in from Telegram WebApp");
        } finally {
          setIsAuthenticating(false);
        }

        return;
      }

      if (telegramContext?.kind === "bot-webapp") {
        try {
          writePendingTelegramContext(telegramContext);
          const existingToken = localStorage.getItem(tokenKey);
          const accessToken = await authenticateTelegramContext(telegramContext, existingToken ?? undefined);
          localStorage.setItem(tokenKey, accessToken);
          localStorage.setItem(authSourceKey, "telegram");
          setToken(accessToken);
        } catch (error) {
          setAuthError(error instanceof Error ? error.message : "Could not sign in from Telegram");
        } finally {
          setIsAuthenticating(false);
        }

        return;
      }

      setIsAuthenticating(false);
    };

    void bootstrap();
  }, [authenticateTelegramContext, ensureCanonicalProfileUrl, routePath]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void fetchSnapshot(token);
  }, [fetchSnapshot, token]);

  useEffect(() => {
    if (!token || !webEnv.botName) {
      return;
    }

    let isCancelled = false;

    void fetch(`${webEnv.apiUrl}/auth/telegram/link-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((response) => parseApiResponse<{ startParam: string }>(response))
      .then((payload) => {
        if (!isCancelled) {
          setTelegramConnectUrl(`https://t.me/${webEnv.botName}?start=${encodeURIComponent(payload.startParam)}`);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTelegramConnectUrl(`https://t.me/${webEnv.botName}`);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!authMe) {
      return;
    }

    const savedTheme = window.localStorage.getItem(themeStorageKey);
    if (savedTheme === "light" || savedTheme === "dark") {
      return;
    }

    persistTheme(authMe.isDark ? "dark" : "light");
  }, [authMe]);

  useEffect(() => {
    if (!categoryCatalog) {
      return;
    }

    const preferredCategoryId = kind === "INCOME" ? categoryCatalog.preferences.defaultIncomeCategoryId : categoryCatalog.preferences.defaultExpenseCategoryId;
    if (!preferredCategoryId) {
      return;
    }

    const option = findCategoryOptionById(categoryCatalog, kind, preferredCategoryId);
    if (!option) {
      return;
    }

    setSelectedCategoryId((current) => {
      if (current && findCategoryOptionById(categoryCatalog, kind, current, { forceIncludeShared: true })) {
        return current;
      }

      return preferredCategoryId;
    });
  }, [categoryCatalog, kind]);

  const onThemeChange = async (theme: ThemeMode) => {
    if (!token) {
      persistTheme(theme);
      return;
    }

    setAuthMe((current) => {
      if (!current) {
        return current;
      }

      const nextAuth = { ...current, isDark: theme === "dark" };
      if (profile && summary && categoryCatalog) {
        writeProfileSnapshotCache({ profile, summary, recent, auth: nextAuth, categories: categoryCatalog });
      }
      return nextAuth;
    });

    try {
      await syncAuthenticatedThemePreference(theme);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not save theme preference");
    }
  };

  const applyCategoryCatalog = useCallback((catalog: CategoryCatalogResponse) => {
    setCategoryCatalog(catalog);
    setShowSharedCategoriesInPicker(catalog.preferences.showSharedCategories);
    setDefaultIncomeCategoryId(catalog.preferences.defaultIncomeCategoryId ?? "");
    setDefaultExpenseCategoryId(catalog.preferences.defaultExpenseCategoryId ?? "");
    setAuthMe((current) => (current ? { ...current, showSharedCategories: catalog.preferences.showSharedCategories } : current));
  }, []);

  const onSaveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setDetailsError(null);
    setDetailsMessage(null);
    setIsSavingDetails(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/details`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: detailsFirstName || undefined,
          lastName: detailsLastName || undefined,
          birthday: detailsBirthday || null
        })
      });

      await parseApiResponse<unknown>(response);
      setDetailsMessage("Profile details saved.");
      await fetchSnapshot(token);
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Could not save details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const onSavePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setPreferencesError(null);
    setPreferencesMessage(null);
    setIsSavingPreferences(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ weekStartsOn })
      });

      const payload = await parseApiResponse<{ weekStartsOn: WeekStartDay }>(response);
      setWeekStartsOn(payload.weekStartsOn);
      setAuthMe((current) => {
        if (!current) {
          return current;
        }

        const nextAuth = { ...current, weekStartsOn: payload.weekStartsOn };
        if (profile && summary && categoryCatalog) {
          writeProfileSnapshotCache({ profile, summary, recent, auth: nextAuth, categories: categoryCatalog });
        }
        return nextAuth;
      });
      setPreferencesMessage("Analytics preferences saved.");
      clearDashboardCache();
    } catch (error) {
      setPreferencesError(error instanceof Error ? error.message : "Could not save analytics preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const onBind = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setBindError(null);
    setBindMessage(null);
    setIsBinding(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/bind`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: bindCode })
      });

      await parseApiResponse<ProfileResponse>(response);
      setBindCode("");
      setBindMessage("Couple connection updated successfully.");
      clearDashboardCache();
      await fetchSnapshot(token);
    } catch (error) {
      setBindError(error instanceof Error ? error.message : "Could not connect by code");
    } finally {
      setIsBinding(false);
    }
  };

  const onSaveCategoryPreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setCategoryPreferencesError(null);
    setCategoryPreferencesMessage(null);
    setIsSavingCategoryPreferences(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/category-preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          showSharedCategories: showSharedCategoriesInPicker,
          defaultIncomeCategoryId: defaultIncomeCategoryId || undefined,
          defaultExpenseCategoryId: defaultExpenseCategoryId || undefined
        })
      });

      const payload = await parseApiResponse<CategoryCatalogResponse>(response);
      applyCategoryCatalog(payload);
      setCategoryPreferencesMessage("Category preferences saved.");
    } catch (error) {
      setCategoryPreferencesError(error instanceof Error ? error.message : "Could not save category preferences");
    } finally {
      setIsSavingCategoryPreferences(false);
    }
  };

  const onCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setCategoryError(null);
    setCategoryMessage(null);
    setIsSavingCategory(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          kind: categoryFormKind,
          scope: categoryFormScope,
          name: categoryFormName,
          parentCategoryId: categoryFormParentId || undefined
        })
      });

      const payload = await parseApiResponse<CategoryCatalogResponse>(response);
      applyCategoryCatalog(payload);
      setCategoryFormName("");
      setCategoryFormParentId("");
      setCategoryMessage("Category saved.");
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Could not save category");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const onDeleteCategory = async (categoryId: string) => {
    if (!token) return;
    setCategoryError(null);
    setCategoryMessage(null);
    setIsDeletingCategoryId(categoryId);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/categories/${categoryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await parseApiResponse<CategoryCatalogResponse>(response);
      applyCategoryCatalog(payload);
      setCategoryMessage("Category removed.");
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Could not remove category");
    } finally {
      setIsDeletingCategoryId(null);
    }
  };

  const onToggleCategoryVisibility = async (categoryId: string, isVisible: boolean) => {
    if (!token) return;
    setCategoryError(null);
    setCategoryMessage(null);
    setIsUpdatingCategoryVisibilityId(categoryId);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/categories/${categoryId}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isVisible })
      });

      const payload = await parseApiResponse<CategoryCatalogResponse>(response);
      applyCategoryCatalog(payload);
      setCategoryMessage(isVisible ? "Category is visible in pickers again." : "Category hidden from pickers.");
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Could not update category visibility");
    } finally {
      setIsUpdatingCategoryVisibilityId(null);
    }
  };

  const onUnbind = async () => {
    if (!token) return;

    const confirmed = window.confirm("Remove this partner connection? Existing shared history will stay preserved, but future work will return to your personal workspace.");
    if (!confirmed) {
      return;
    }

    setBindError(null);
    setBindMessage(null);
    setIsUnbinding(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/bind`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await parseApiResponse<ProfileResponse>(response);
      setBindCode("");
      setBindMessage("Partner connection removed. You are back in your personal workspace.");
      clearDashboardCache();
      await fetchSnapshot(token);
    } catch (error) {
      setBindError(error instanceof Error ? error.message : "Could not remove partner connection");
    } finally {
      setIsUnbinding(false);
    }
  };

  const onCreateTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      console.warn("[transaction:create] blocked: missing auth token");
      setTxError("Your session is not ready. Refresh the page and try again.");
      return;
    }

    const parsedAmount = parseTransactionAmount(amount);
    const missingFields = [
      Number.isFinite(parsedAmount) && parsedAmount > 0 ? null : "amount",
      selectedCategoryId ? null : "category"
    ].filter((item): item is string => Boolean(item));
    if (missingFields.length > 0) {
      console.warn("[transaction:create] blocked: invalid form", {
        missingFields,
        amount,
        kind,
        currency,
        selectedCategoryId
      });
      setTxError(`Check ${missingFields.join(" and ")} before saving.`);
      return;
    }

    setTxError(null);
    setTxMessage(null);
    setIsSubmittingTx(true);

    try {
      const payload = {
        amount: parsedAmount,
        kind,
        currency,
        categoryId: selectedCategoryId,
        note: note || undefined
      };
      console.info("[transaction:create] sending", {
        amount: payload.amount,
        kind: payload.kind,
        currency: payload.currency,
        hasCategoryId: Boolean(payload.categoryId),
        hasNote: Boolean(payload.note)
      });
      const response = await fetch(`${webEnv.apiUrl}/profile/me/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      console.info("[transaction:create] response", { status: response.status, ok: response.ok });

      await parseApiResponse<unknown>(response);
      setAmount("");
      setCurrency(preferredCurrencies[0] ?? "UZS");
      setSelectedCategoryId("");
      setNote("");
      setTxMessage(`${kind === "INCOME" ? "Income" : "Expense"} added.`);
      await fetchSnapshot(token);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : "Could not add transaction");
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const onSetupPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSetupError(null);
    setSetupMessage(null);

    if (setupPassword !== setupConfirmPassword) {
      setSetupError("Passwords do not match");
      return;
    }

    setIsSettingPassword(true);
    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: setupEmail, password: setupPassword })
      });

      const payload = await parseApiResponse<{ accessToken: string }>(response);
      const accessToken = await attachPendingTelegramContext(payload.accessToken);
      localStorage.setItem(tokenKey, accessToken);
      setToken(accessToken);
      setSetupPassword("");
      setSetupConfirmPassword("");
      setSetupMessage("Email login is ready. You can now sign in from browser.");
      await fetchSnapshot(accessToken);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Could not setup web credentials");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const onChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setChangePasswordError(null);
    setChangePasswordMessage(null);

    if (newPassword !== newConfirmPassword) {
      setChangePasswordError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      await parseApiResponse<{ ok: boolean }>(response);
      setCurrentPassword("");
      setNewPassword("");
      setNewConfirmPassword("");
      setChangePasswordMessage("Password changed.");
      await fetchSnapshot(token);
    } catch (error) {
      setChangePasswordError(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const startEditing = (item: RecentTransaction) => {
    setTxMessage(null);
    setTxError(null);
    setEditingTransaction({
      id: item.id,
      amount: String(item.amount),
      kind: item.kind,
      currency: clampDashboardRateCurrency(item.currency, preferredCurrencies),
      categoryId: item.category.id,
      categoryName: item.category.name,
      note: item.note ?? ""
    });
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !editingTransaction) return;
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
          categoryId: editingTransaction.categoryId || undefined,
          categoryName: editingTransaction.categoryName,
          note: editingTransaction.note || undefined
        })
      });

      await parseApiResponse<unknown>(response);
      setEditingTransaction(null);
      setTxMessage("Transaction updated.");
      await fetchSnapshot(token);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : "Could not update transaction");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDeleteTransaction = async (transactionId: string) => {
    if (!token) return;
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
      await fetchSnapshot(token);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : "Could not delete transaction");
    } finally {
      setIsDeletingId(null);
    }
  };

  const greeting = useMemo(() => getTashkentGreeting(authMe?.firstName ?? authMe?.username), [authMe?.firstName, authMe?.username]);
  const hasRealTelegramIdentity = Boolean(authMe && !authMe.telegramId.startsWith("-"));
  const telegramDisplayName = hasRealTelegramIdentity ? [authMe?.firstName, authMe?.lastName].filter(Boolean).join(" ") || "Not linked yet" : "Not linked yet";
  const telegramUsername = hasRealTelegramIdentity && authMe?.username ? `@${authMe.username}` : "Not linked yet";
  return {
    token,
    authError,
    isAuthenticating,
    authMe,
    profile,
    summary,
    recent,
    isLoadingData,
    greeting,
    supportedCurrencies,
    preferredCurrencies,
    detailsFirstName,
    setDetailsFirstName,
    detailsLastName,
    setDetailsLastName,
    detailsBirthday,
    setDetailsBirthday,
    weekStartsOn,
    setWeekStartsOn,
    telegramDisplayName,
    telegramUsername,
    telegramConnectUrl,
    isSavingDetails,
    detailsMessage,
    detailsError,
    onSaveDetails,
    isSavingPreferences,
    preferencesMessage,
    preferencesError,
    onSavePreferences,
    setupEmail,
    setSetupEmail,
    setupPassword,
    setSetupPassword,
    setupConfirmPassword,
    setSetupConfirmPassword,
    isSettingPassword,
    setupMessage,
    setupError,
    onSetupPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    newConfirmPassword,
    setNewConfirmPassword,
    isChangingPassword,
    changePasswordMessage,
    changePasswordError,
    onChangePassword,
    bindCode,
    setBindCode,
    bindMessage,
    bindError,
    isBinding,
    isUnbinding,
    onBind,
    onUnbind,
    kind,
    setKind,
    amount,
    setAmount,
    currency,
    setCurrency,
    selectedCategoryId,
    setSelectedCategoryId,
    categoryCatalog,
    showSharedCategoriesInPicker,
    setShowSharedCategoriesInPicker,
    defaultIncomeCategoryId,
    setDefaultIncomeCategoryId,
    defaultExpenseCategoryId,
    setDefaultExpenseCategoryId,
    isSavingCategoryPreferences,
    categoryPreferencesMessage,
    categoryPreferencesError,
    onSaveCategoryPreferences,
    categoryFormKind,
    setCategoryFormKind,
    categoryFormScope,
    setCategoryFormScope,
    categoryFormName,
    setCategoryFormName,
    categoryFormParentId,
    setCategoryFormParentId,
    isSavingCategory,
    isDeletingCategoryId,
    isUpdatingCategoryVisibilityId,
    categoryMessage,
    categoryError,
    onCreateCategory,
    onDeleteCategory,
    onToggleCategoryVisibility,
    note,
    setNote,
    txMessage,
    txError,
    isSubmittingTx,
    editingTransaction,
    setEditingTransaction,
    isSavingEdit,
    isDeletingId,
    onCreateTransaction,
    onSaveEdit,
    onDeleteTransaction,
    startEditing,
    onThemeChange,
    clearSession
  };
}
