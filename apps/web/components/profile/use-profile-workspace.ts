"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { webEnv } from "@/lib/env";
import { persistTheme, type ThemeMode } from "@/lib/theme";

import { parseApiResponse } from "./api";
import { clearDashboardCache, clearProfileSnapshotCache, readProfileSnapshotCache, writeProfileSnapshotCache } from "./cache";
import { getTashkentGreeting } from "./greeting";
import { clearPendingTelegramContext, detectTelegramContextFromWindow, readPendingTelegramContext, writePendingTelegramContext, type PendingTelegramContext } from "./telegram-context";
import {
  authSourceKey,
  canonicalProfilePath,
  type AuthMeResponse,
  type EditableTransaction,
  type ProfileResponse,
  type ProfileSnapshotResponse,
  type RecentTransaction,
  supportedCurrencies,
  tokenKey,
  type SupportedCurrency,
  type MonthlySummary
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

export function useProfileWorkspace(options?: UseProfileWorkspaceOptions) {
  const routePath = options?.routePath ?? canonicalProfilePath;
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null);

  const [cachedSnapshot, setCachedSnapshot] = useState<ProfileSnapshotResponse | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showCreateAccountAction, setShowCreateAccountAction] = useState(false);

  const [createFirstName, setCreateFirstName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createAccountMessage, setCreateAccountMessage] = useState<string | null>(null);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  const [detailsFirstName, setDetailsFirstName] = useState("");
  const [detailsLastName, setDetailsLastName] = useState("");
  const [detailsBirthday, setDetailsBirthday] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [bindCode, setBindCode] = useState("");
  const [bindMessage, setBindMessage] = useState<string | null>(null);
  const [bindError, setBindError] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState(false);

  const [kind, setKind] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>("UZS");
  const [categoryName, setCategoryName] = useState("");
  const [note, setNote] = useState("");
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditableTransaction | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  const applySnapshot = useCallback((snapshot: ProfileSnapshotResponse) => {
    writeProfileSnapshotCache(snapshot);
    setCachedSnapshot(snapshot);
    setProfile(snapshot.profile);
    setSummary(snapshot.summary);
    setRecent(snapshot.recent);
    setAuthMe(snapshot.auth);
    setDetailsFirstName(snapshot.auth.firstName ?? "");
    setDetailsLastName(snapshot.auth.lastName ?? "");
    setDetailsBirthday(snapshot.auth.birthday?.slice(0, 10) ?? "");

    if (snapshot.auth.email) {
      setSetupEmail((current) => current || snapshot.auth.email || "");
    }
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(authSourceKey);
    clearProfileSnapshotCache();
    clearDashboardCache();
    clearPendingTelegramContext();
    setToken(null);
    setAuthMe(null);
    setProfile(null);
    setSummary(null);
    setRecent([]);
    setCachedSnapshot(null);
    setDetailsFirstName("");
    setDetailsLastName("");
    setDetailsBirthday("");
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
              ? JSON.stringify({ initData: context.initData })
              : JSON.stringify({
                  telegramId: context.telegramId,
                  chatId: context.chatId,
                  timestamp: context.timestamp,
                  signature: context.signature
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
    const bootstrap = async () => {
      ensureCanonicalProfileUrl(routePath);

      const telegramContext = detectTelegramContextFromWindow();

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

    if (cachedSnapshot) {
      applySnapshot(cachedSnapshot);
    }

    void fetchSnapshot(token);
  }, [applySnapshot, cachedSnapshot, fetchSnapshot, token]);

  useEffect(() => {
    if (!authMe) {
      return;
    }

    persistTheme(authMe.isDark ? "dark" : "light");
  }, [authMe]);

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
      if (profile && summary) {
        writeProfileSnapshotCache({ profile, summary, recent, auth: nextAuth });
      }
      return nextAuth;
    });

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/preferences/theme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isDark: theme === "dark" })
      });

      await parseApiResponse<{ isDark: boolean }>(response);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not save theme preference");
    }
  };

  const onSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setLoginMessage(null);
    setShowCreateAccountAction(false);
    setIsSubmittingLogin(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const payload = await parseApiResponse<{ accessToken: string }>(response);
      const accessToken = await attachPendingTelegramContext(payload.accessToken);
      localStorage.setItem(tokenKey, accessToken);
      localStorage.setItem(authSourceKey, "website");
      setToken(accessToken);
      setLoginMessage("Signed in successfully.");
      setLoginPassword("");
      ensureCanonicalProfileUrl();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in";
      setLoginError(message);
      const missing = message === "Account was not found. Please create account.";
      setShowCreateAccountAction(missing);
      if (missing) {
        setCreateEmail(loginEmail);
      }
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const onCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateAccountError(null);
    setCreateAccountMessage(null);

    if (createPassword !== createConfirmPassword) {
      setCreateAccountError("Passwords do not match");
      return;
    }

    setIsCreatingAccount(true);
    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: createFirstName || undefined,
          email: createEmail,
          password: createPassword
        })
      });

      const payload = await parseApiResponse<{ accessToken: string }>(response);
      const accessToken = await attachPendingTelegramContext(payload.accessToken);
      localStorage.setItem(tokenKey, accessToken);
      localStorage.setItem(authSourceKey, "website");
      setToken(accessToken);
      setCreateAccountMessage("Account created successfully.");
      setCreateFirstName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateConfirmPassword("");
      setShowCreateAccountAction(false);
    } catch (error) {
      setCreateAccountError(error instanceof Error ? error.message : "Could not create account");
    } finally {
      setIsCreatingAccount(false);
    }
  };

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
      await fetchSnapshot(token);
    } catch (error) {
      setBindError(error instanceof Error ? error.message : "Could not connect by code");
    } finally {
      setIsBinding(false);
    }
  };

  const onCreateTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setTxError(null);
    setTxMessage(null);
    setIsSubmittingTx(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/me/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(amount), kind, currency, categoryName, note: note || undefined })
      });

      await parseApiResponse<unknown>(response);
      setAmount("");
      setCurrency("UZS");
      setCategoryName("");
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

  const startEditing = (item: RecentTransaction) => {
    setTxMessage(null);
    setTxError(null);
    setEditingTransaction({
      id: item.id,
      amount: String(item.amount),
      kind: item.kind,
      currency: item.currency,
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
  const telegramUsername = authMe?.username ? `@${authMe.username}` : "Not linked yet";
  const refreshSnapshot = useCallback(async () => {
    if (!token) {
      return;
    }

    await fetchSnapshot(token);
  }, [fetchSnapshot, token]);

  const linkTelegramFromCurrentContext = useCallback(async () => {
    if (!token) {
      return false;
    }

    const pending = readPendingTelegramContext() ?? detectTelegramContextFromWindow();
    if (!pending) {
      setAuthError("No live Telegram session was detected on this page. Open the app from Telegram or use the Telegram sign-in widget below.");
      return false;
    }

    try {
      const accessToken = await authenticateTelegramContext(pending, token);
      localStorage.setItem(tokenKey, accessToken);
      setToken(accessToken);
      await fetchSnapshot(accessToken);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not link current Telegram session");
      return false;
    }
  }, [authenticateTelegramContext, fetchSnapshot, token]);

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
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    isSubmittingLogin,
    loginMessage,
    loginError,
    showCreateAccountAction,
    onSubmitLogin,
    createFirstName,
    setCreateFirstName,
    createEmail,
    setCreateEmail,
    createPassword,
    setCreatePassword,
    createConfirmPassword,
    setCreateConfirmPassword,
    isCreatingAccount,
    createAccountMessage,
    createAccountError,
    onCreateAccount,
    detailsFirstName,
    setDetailsFirstName,
    detailsLastName,
    setDetailsLastName,
    detailsBirthday,
    setDetailsBirthday,
    telegramUsername,
    isSavingDetails,
    detailsMessage,
    detailsError,
    onSaveDetails,
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
    bindCode,
    setBindCode,
    bindMessage,
    bindError,
    isBinding,
    onBind,
    kind,
    setKind,
    amount,
    setAmount,
    currency,
    setCurrency,
    categoryName,
    setCategoryName,
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
    refreshSnapshot,
    linkTelegramFromCurrentContext,
    onThemeChange,
    clearSession
  };
}
