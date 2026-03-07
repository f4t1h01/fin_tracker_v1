"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Pencil, PlusCircle, Trash2, WalletCards, X } from "lucide-react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { TelegramLogin } from "@/components/telegram-login";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";
import { persistTheme, type ThemeMode } from "@/lib/theme";

type ProfileResponse = {
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
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

type MonthlySummary = {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

type RecentTransaction = {
  id: string;
  kind: "EXPENSE" | "INCOME";
  amount: number | string;
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

type EditableTransaction = {
  id: string;
  amount: string;
  kind: "EXPENSE" | "INCOME";
  categoryName: string;
  note: string;
};

type AuthMeResponse = {
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
  isAdmin: boolean;
  isDark: boolean;
};

type ProfileSnapshotResponse = {
  profile: ProfileResponse;
  summary: MonthlySummary;
  recent: RecentTransaction[];
  auth: AuthMeResponse;
};

const tokenKey = "cf_token";
const canonicalProfilePath = "/profile/me";

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  const fallbackMessage = `Request failed with status ${response.status}`;
  let errorMessage = fallbackMessage;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      errorMessage = payload.message.join(", ");
    } else if (payload.message) {
      errorMessage = payload.message;
    }
  } catch {}

  throw new Error(errorMessage);
}

export function ProfileWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showCreateAccountAction, setShowCreateAccountAction] = useState(false);
  const [createAccountHint, setCreateAccountHint] = useState<string | null>(null);

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
  const [categoryName, setCategoryName] = useState("");
  const [note, setNote] = useState("");
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditableTransaction | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setToken(null);
    setAuthMe(null);
    setProfile(null);
    setSummary(null);
    setRecent([]);
  }, []);

  const ensureCanonicalProfileUrl = useCallback(() => {
    if (window.location.pathname !== canonicalProfilePath) {
      window.history.replaceState({}, "", canonicalProfilePath);
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

        setProfile(snapshot.profile);
        setSummary(snapshot.summary);
        setRecent(snapshot.recent);
        setAuthMe(snapshot.auth);

        if (snapshot.auth.email) {
          setSetupEmail((current) => current || snapshot.auth.email || "");
        }
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
    [clearSession, today]
  );

  useEffect(() => {
    const bootstrap = async () => {
      ensureCanonicalProfileUrl();

      const params = new URLSearchParams(window.location.search);
      const telegramId = params.get("telegramId");
      const chatId = params.get("chatId");
      const timestamp = params.get("timestamp");
      const signature = params.get("signature");

      if (!telegramId || !timestamp || !signature) {
        const existing = localStorage.getItem(tokenKey);
        if (existing) {
          setToken(existing);
          ensureCanonicalProfileUrl();
        }

        setIsAuthenticating(false);
        return;
      }

      try {
        const existingToken = localStorage.getItem(tokenKey);
        const response = await fetch(`${webEnv.apiUrl}/auth/bot-webapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(existingToken ? { Authorization: `Bearer ${existingToken}` } : {})
          },
          body: JSON.stringify({
            telegramId,
            chatId,
            timestamp: Number(timestamp),
            signature
          })
        });

        const payload = await parseApiResponse<{ accessToken: string }>(response);
        localStorage.setItem(tokenKey, payload.accessToken);
        setToken(payload.accessToken);
        setAuthError(null);
        window.history.replaceState({}, "", canonicalProfilePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not sign in from Telegram";
        setAuthError(message);
      } finally {
        setIsAuthenticating(false);
      }
    };

    void bootstrap();
  }, [ensureCanonicalProfileUrl]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void fetchSnapshot(token);
  }, [fetchSnapshot, token]);

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

    setAuthMe((current) => (current ? { ...current, isDark: theme === "dark" } : current));

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
    setCreateAccountHint(null);
    setShowCreateAccountAction(false);
    setIsSubmittingLogin(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const payload = await parseApiResponse<{ accessToken: string }>(response);
      localStorage.setItem(tokenKey, payload.accessToken);
      setToken(payload.accessToken);
      setAuthError(null);
      setLoginMessage("Signed in successfully.");
      setLoginPassword("");
      ensureCanonicalProfileUrl();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in";
      setLoginError(message);
      setShowCreateAccountAction(message === "No account found for this email");
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const onCreateAccount = () => {
    setCreateAccountHint("Use Telegram below to create your Duet account first, then save browser login inside your profile.");
    const telegramCard = document.getElementById("profile-telegram-auth");
    telegramCard?.scrollIntoView({ behavior: "smooth", block: "center" });
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
        body: JSON.stringify({ amount: Number(amount), kind, categoryName, note: note || undefined })
      });
      await parseApiResponse<unknown>(response);
      setAmount("");
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
      localStorage.setItem(tokenKey, payload.accessToken);
      setToken(payload.accessToken);
      setSetupPassword("");
      setSetupConfirmPassword("");
      setSetupMessage("Email login is ready. You can now sign in from browser.");
      await fetchSnapshot(payload.accessToken);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Could not setup web credentials");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const startEditing = (item: RecentTransaction) => {
    setTxMessage(null);
    setTxError(null);
    setEditingTransaction({ id: item.id, amount: String(item.amount), kind: item.kind, categoryName: item.category.name, note: item.note ?? "" });
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
        headers: { Authorization: `Bearer ${token}` }
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

  const displayName = useMemo(() => "Good day", []);

  const onTelegramSuccess = useCallback(() => {
    const existing = localStorage.getItem(tokenKey);
    if (existing) {
      setToken(existing);
      setAuthError(null);
      ensureCanonicalProfileUrl();
    }
  }, [ensureCanonicalProfileUrl]);

  if (isAuthenticating) {
    return <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8"><Card className="panel-soft w-full max-w-xl"><CardHeader><CardTitle className="flex items-center gap-2"><Loader2 className="size-5 animate-spin text-pop" />Preparing your profile</CardTitle><CardDescription>Checking saved access and Telegram handoff...</CardDescription></CardHeader></Card></main>;
  }

  if (!token) {
    return <main className="container-shell pb-16 pt-24"><header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4"><div className="space-y-4"><BrandMark href="/" /><div><p className="eyebrow-row">Profile access</p><h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Sign in or start your account here.</h1><p className="body-muted mt-3 max-w-2xl text-sm">Email login works for returning members. New accounts still begin with Telegram, then you can save browser access inside your profile.</p></div></div><ThemeToggle /></header>{authError ? <Card className="mb-6 border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10"><CardContent className="pt-6"><p className="status-error text-sm">{authError}</p></CardContent></Card> : null}<section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><Card className="panel-soft"><CardHeader><CardTitle>Sign in with email</CardTitle><CardDescription>Use this when you already saved browser credentials from your Duet profile.</CardDescription></CardHeader><CardContent className="space-y-4"><form className="space-y-3" onSubmit={onSubmitLogin}><label className="space-y-1 text-sm"><span className="field-label">Email</span><input required type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="you@example.com" className="form-input" /></label><label className="space-y-1 text-sm"><span className="field-label">Password</span><input required type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Your password" className="form-input" /></label><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={isSubmittingLogin}>{isSubmittingLogin ? "Signing in..." : "Sign in"}</Button>{loginMessage ? <p className="status-success text-sm">{loginMessage}</p> : null}{loginError ? <p className="status-error text-sm">{loginError}</p> : null}</div></form>{showCreateAccountAction ? <div className="detail-box space-y-3 text-sm"><p className="body-muted">No browser account exists for this email yet. Start with Telegram once, then save email access from inside your profile.</p><Button type="button" variant="outline" onClick={onCreateAccount}>Create account</Button></div> : null}{createAccountHint ? <p className="body-muted text-sm">{createAccountHint}</p> : null}</CardContent></Card><Card className="panel-soft" id="profile-telegram-auth"><CardHeader><CardTitle>Start with Telegram</CardTitle><CardDescription>Use Telegram to create your account, reconnect your chat, or link browser access to the same profile.</CardDescription></CardHeader><CardContent className="space-y-4"><TelegramLogin onSuccess={onTelegramSuccess} /><div className="detail-box space-y-2 text-sm"><p>1. Sign in with Telegram.</p><p>2. Open your profile.</p><p>3. Save email login once for future website access.</p></div><Button variant="outline" asChild><a href="/">Back to overview</a></Button></CardContent></Card></section></main>;
  }

  if (!profile || !authMe) {
    return <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8"><Card className="panel-soft w-full max-w-xl"><CardHeader><CardTitle className="flex items-center gap-2"><Loader2 className="size-5 animate-spin text-pop" />Loading your workspace</CardTitle><CardDescription>{authError ?? "Fetching profile, balances, and recent activity..."}</CardDescription></CardHeader></Card></main>;
  }

  return <main className="container-shell pb-16 pt-28"><header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4"><div className="space-y-4"><BrandMark href="/" /><div><div className="eyebrow-row">Profile workspace</div><h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">{displayName}</h1><p className="body-muted mt-3 text-sm">Your workspace is ready. Code: <span className="font-semibold text-[var(--gold)]">{profile.user.coupleCode ?? "-"}</span></p></div></div><div className="flex items-center gap-3"><ThemeToggle onChange={(theme) => void onThemeChange(theme)} /><Button variant="outline" asChild><a href="/">Back to overview</a></Button></div></header>{authError ? <Card className="mb-6 border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10"><CardContent className="pt-6"><p className="status-error text-sm">{authError}</p></CardContent></Card> : null}{!authMe.hasPassword ? <section className="mb-6"><Card className="panel-soft border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--gold)_8%,var(--card-bg))]"><CardHeader><CardTitle>Save email login</CardTitle><CardDescription>Finish this once. After that, you can open your Duet profile directly from the browser without Telegram first.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-3" onSubmit={onSetupPassword}><label className="space-y-1 text-sm"><span className="field-label">Email</span><input required type="email" value={setupEmail} onChange={(event) => setSetupEmail(event.target.value)} placeholder="you@example.com" className="form-input" /></label><label className="space-y-1 text-sm"><span className="field-label">Password</span><input required type="password" minLength={8} value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} placeholder="At least 8 characters" className="form-input" /></label><label className="space-y-1 text-sm"><span className="field-label">Confirm password</span><input required type="password" minLength={8} value={setupConfirmPassword} onChange={(event) => setSetupConfirmPassword(event.target.value)} placeholder="Repeat password" className="form-input" /></label><div className="flex items-center gap-3 md:col-span-3"><Button type="submit" disabled={isSettingPassword}>{isSettingPassword ? "Saving..." : "Save email login"}</Button>{setupMessage ? <p className="status-success text-sm">{setupMessage}</p> : null}{setupError ? <p className="status-error text-sm">{setupError}</p> : null}</div></form></CardContent></Card></section> : null}<section className="mb-6 grid gap-4 md:grid-cols-3"><Card className="metric-income"><CardHeader><CardTitle>Income</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{summary ? `${summary.totalIncome.toLocaleString()} UZS` : "-"}</CardContent></Card><Card className="metric-expense"><CardHeader><CardTitle>Expense</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-rose-700 dark:text-rose-200">{summary ? `${summary.totalExpense.toLocaleString()} UZS` : "-"}</CardContent></Card><Card className="metric-balance"><CardHeader><CardTitle>Balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary ? `${summary.balance.toLocaleString()} UZS` : "-"}</CardContent></Card></section><section className="grid gap-5 lg:grid-cols-2"><Card className="panel-soft"><CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-pop" />Add income or expense</CardTitle><CardDescription>Transactions are saved to your active couple workspace: {profile.activeCouple?.name ?? "Personal workspace"}</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={onCreateTransaction}><div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm"><span className="field-label">Type</span><select value={kind} onChange={(event) => setKind(event.target.value as "EXPENSE" | "INCOME")} className="form-select"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label><label className="space-y-1 text-sm"><span className="field-label">Amount</span><input required inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="45000" className="form-input" /></label></div><label className="space-y-1 text-sm"><span className="field-label">Category</span><input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="groceries / salary" className="form-input" /></label><label className="space-y-1 text-sm"><span className="field-label">Note (optional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="short context" className="form-input" /></label><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={isSubmittingTx}>{isSubmittingTx ? "Saving..." : "Save transaction"}</Button>{txMessage ? <p className="status-success text-sm">{txMessage}</p> : null}{txError ? <p className="status-error text-sm">{txError}</p> : null}</div></form></CardContent></Card><Card className="panel-soft"><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5 text-pop" />Connect partner by code</CardTitle><CardDescription>Share your code <span className="font-semibold text-ink dark:text-white">{profile.user.coupleCode}</span> and enter your partner&apos;s code below.</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={onBind}><label className="space-y-1 text-sm"><span className="field-label">Partner code</span><input required value={bindCode} onChange={(event) => setBindCode(event.target.value.toUpperCase())} placeholder="AB12CD" className="form-input" /></label><div className="flex flex-wrap items-center gap-3"><Button type="submit" variant="outline" disabled={isBinding}>{isBinding ? "Connecting..." : "Connect"}</Button>{bindMessage ? <p className="status-success text-sm">{bindMessage}</p> : null}{bindError ? <p className="status-error text-sm">{bindError}</p> : null}</div><div className="detail-box text-sm"><p>Active workspace: {profile.activeCouple?.name ?? "None"}</p><p>Role: {profile.activeCouple?.role ?? "-"}</p><p>Last linked code: {profile.bind?.insertedCode ?? "Not linked yet"}</p></div></form></CardContent></Card></section><section className="mt-6"><Card className="panel-soft"><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-pop" />Recent activity</CardTitle><CardDescription>Latest 20 transactions from your active workspace.</CardDescription></CardHeader><CardContent>{isLoadingData ? <p className="body-muted text-sm">Refreshing...</p> : recent.length === 0 ? <p className="body-muted text-sm">No transactions yet.</p> : <div className="space-y-2">{recent.map((item) => { const amountNumber = Number(item.amount); const amountClass = item.kind === "INCOME" ? "text-emerald-700 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200"; const actor = item.user.firstName ?? item.user.username ?? "Member"; return <div key={item.id} className="detail-box px-3 py-3 text-sm"><div><div className="flex items-center justify-between gap-3"><p className="font-medium">{item.category.name}</p><p className={`font-semibold ${amountClass}`}>{item.kind === "INCOME" ? "+" : "-"}{amountNumber.toLocaleString()} UZS</p></div><p className="body-muted text-xs">{actor} - {item.note ?? "No note"} - {new Date(item.happenedAt).toLocaleString()}</p></div><div className="mt-3 flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => startEditing(item)}><Pencil className="size-3.5" />Edit</Button><Button type="button" size="sm" variant="ghost" disabled={isDeletingId === item.id} onClick={() => void onDeleteTransaction(item.id)}><Trash2 className="size-3.5" />{isDeletingId === item.id ? "Deleting..." : "Delete"}</Button></div></div>; })}</div>}</CardContent></Card></section>{editingTransaction ? <section className="mt-6"><Card className="panel-soft"><CardHeader><CardTitle className="flex items-center gap-2"><Pencil className="size-5 text-pop" />Edit transaction</CardTitle><CardDescription>Adjust only your own saved transaction.</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={onSaveEdit}><div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm"><span className="field-label">Type</span><select value={editingTransaction.kind} onChange={(event) => setEditingTransaction((current) => (current ? { ...current, kind: event.target.value as "EXPENSE" | "INCOME" } : current))} className="form-select"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label><label className="space-y-1 text-sm"><span className="field-label">Amount</span><input required inputMode="decimal" min="0.01" step="0.01" value={editingTransaction.amount} onChange={(event) => setEditingTransaction((current) => (current ? { ...current, amount: event.target.value } : current))} className="form-input" /></label></div><label className="space-y-1 text-sm"><span className="field-label">Category</span><input required value={editingTransaction.categoryName} onChange={(event) => setEditingTransaction((current) => (current ? { ...current, categoryName: event.target.value } : current))} className="form-input" /></label><label className="space-y-1 text-sm"><span className="field-label">Note</span><input value={editingTransaction.note} onChange={(event) => setEditingTransaction((current) => (current ? { ...current, note: event.target.value } : current))} className="form-input" /></label><div className="flex items-center gap-3"><Button type="submit" disabled={isSavingEdit}>{isSavingEdit ? "Saving..." : "Save changes"}</Button><Button type="button" variant="outline" onClick={() => setEditingTransaction(null)}><X className="size-4" />Cancel</Button></div></form></CardContent></Card></section> : null}</main>;
}
