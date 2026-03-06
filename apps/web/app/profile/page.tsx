"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Pencil, PlusCircle, Trash2, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";

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
};

const tokenKey = "cf_token";

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

export default function ProfilePage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null);

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

  const fetchSnapshot = useCallback(
    async (authToken: string) => {
      setIsLoadingData(true);
      setAuthError(null);

      try {
        const [profileResponse, summaryResponse, recentResponse, meResponse] = await Promise.all([
          fetch(`${webEnv.apiUrl}/profile`, {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }).then((response) => parseApiResponse<ProfileResponse>(response)),
          fetch(`${webEnv.apiUrl}/profile/summary?month=${today.getMonth() + 1}&year=${today.getFullYear()}`, {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }).then((response) => parseApiResponse<MonthlySummary>(response)),
          fetch(`${webEnv.apiUrl}/profile/transactions/recent`, {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }).then((response) => parseApiResponse<RecentTransaction[]>(response)),
          fetch(`${webEnv.apiUrl}/auth/me`, {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }).then((response) => parseApiResponse<AuthMeResponse>(response))
        ]);

        setProfile(profileResponse);
        setSummary(summaryResponse);
        setRecent(recentResponse);
        setAuthMe(meResponse);

        if (meResponse.email) {
          setSetupEmail((current) => current || meResponse.email || "");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load profile data";

        if (message === "Invalid token" || message === "Missing bearer token") {
          localStorage.removeItem(tokenKey);
          setToken(null);
          router.replace("/login");
        }

        setAuthError(message);
      } finally {
        setIsLoadingData(false);
      }
    },
    [router, today]
  );

  useEffect(() => {
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const telegramId = params.get("telegramId");
      const chatId = params.get("chatId");
      const timestamp = params.get("timestamp");
      const signature = params.get("signature");

      if (!telegramId || !timestamp || !signature) {
        const existing = localStorage.getItem(tokenKey);
        if (existing) {
          setToken(existing);
          setIsAuthenticating(false);
          return;
        }

        router.replace("/login");
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

        window.history.replaceState({}, "", "/profile");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not sign in from Telegram";
        setAuthError(message);
      } finally {
        setIsAuthenticating(false);
      }
    };

    void bootstrap();
  }, [router]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void fetchSnapshot(token);
  }, [fetchSnapshot, token]);

  const onBind = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setBindError(null);
    setBindMessage(null);
    setIsBinding(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/bind`, {
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
      const message = error instanceof Error ? error.message : "Could not connect by code";
      setBindError(message);
    } finally {
      setIsBinding(false);
    }
  };

  const onCreateTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setTxError(null);
    setTxMessage(null);
    setIsSubmittingTx(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(amount),
          kind,
          categoryName,
          note: note || undefined
        })
      });

      await parseApiResponse(response);
      setAmount("");
      setCategoryName("");
      setNote("");
      setTxMessage(`${kind === "INCOME" ? "Income" : "Expense"} added.`);
      await fetchSnapshot(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add transaction";
      setTxError(message);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const onSetupPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

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
        body: JSON.stringify({
          email: setupEmail,
          password: setupPassword
        })
      });

      const payload = await parseApiResponse<{ accessToken: string }>(response);
      localStorage.setItem(tokenKey, payload.accessToken);
      setToken(payload.accessToken);
      setSetupPassword("");
      setSetupConfirmPassword("");
      setSetupMessage("Email login is ready. You can now sign in from browser.");

      await fetchSnapshot(payload.accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not setup web credentials";
      setSetupError(message);
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
      categoryName: item.category.name,
      note: item.note ?? ""
    });
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !editingTransaction) {
      return;
    }

    setTxError(null);
    setTxMessage(null);
    setIsSavingEdit(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/transactions/${editingTransaction.id}`, {
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

      await parseApiResponse(response);
      setEditingTransaction(null);
      setTxMessage("Transaction updated.");
      await fetchSnapshot(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update transaction";
      setTxError(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDeleteTransaction = async (transactionId: string) => {
    if (!token) {
      return;
    }

    setTxError(null);
    setTxMessage(null);
    setIsDeletingId(transactionId);

    try {
      const response = await fetch(`${webEnv.apiUrl}/profile/transactions/${transactionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await parseApiResponse(response);
      if (editingTransaction?.id === transactionId) {
        setEditingTransaction(null);
      }
      setTxMessage("Transaction deleted.");
      await fetchSnapshot(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete transaction";
      setTxError(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const displayName = useMemo(() => {
    if (!profile) {
      return "Your profile";
    }

    return profile.user.firstName ?? profile.user.username ?? "Telegram user";
  }, [profile]);

  if (isAuthenticating) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
        <Card className="w-full max-w-xl border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin text-pop" />
              Authenticating with Telegram
            </CardTitle>
            <CardDescription>Preparing your profile securely...</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!token || authError) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
        <Card className="w-full max-w-xl border-red-300/20 bg-red-500/10">
          <CardHeader>
            <CardTitle>Could not open profile</CardTitle>
            <CardDescription>{authError ?? "Missing auth token"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-white/75">Use website login if you already have email access, or open from Telegram to link and refresh your chat session.</p>
              <Button variant="outline" asChild>
                <a href="/login">Go to login</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8">
      <header className="soft-rise mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Profile workspace</p>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl">{displayName}</h1>
          <p className="text-sm text-white/70">Your code: <span className="font-semibold text-pop">{profile?.user.coupleCode ?? "-"}</span></p>
        </div>
        <Button variant="outline" asChild>
          <a href="/">Back to overview</a>
        </Button>
      </header>

      {authMe && !authMe.hasPassword ? (
        <section className="mb-6">
          <Card className="border-amber-300/25 bg-amber-500/10">
            <CardHeader>
              <CardTitle>Set email login</CardTitle>
              <CardDescription>
                Finish your account setup once. Next time you can login from browser without opening Telegram first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-3" onSubmit={onSetupPassword}>
                <label className="space-y-1 text-sm">
                  <span className="text-white/70">Email</span>
                  <input
                    required
                    type="email"
                    value={setupEmail}
                    onChange={(event) => setSetupEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-white/70">Password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={setupPassword}
                    onChange={(event) => setSetupPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-white/70">Confirm password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={setupConfirmPassword}
                    onChange={(event) => setSetupConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                  />
                </label>

                <div className="md:col-span-3 flex items-center gap-3">
                  <Button type="submit" disabled={isSettingPassword}>
                    {isSettingPassword ? "Saving..." : "Save email login"}
                  </Button>
                  {setupMessage ? <p className="text-sm text-emerald-200">{setupMessage}</p> : null}
                  {setupError ? <p className="text-sm text-rose-200">{setupError}</p> : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-300/20 bg-emerald-500/10">
          <CardHeader>
            <CardTitle>Income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-200">{summary ? `${summary.totalIncome.toLocaleString()} UZS` : "-"}</CardContent>
        </Card>
        <Card className="border-rose-300/20 bg-rose-500/10">
          <CardHeader>
            <CardTitle>Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-200">{summary ? `${summary.totalExpense.toLocaleString()} UZS` : "-"}</CardContent>
        </Card>
        <Card className="border-pop/30 bg-white/10">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary ? `${summary.balance.toLocaleString()} UZS` : "-"}</CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="size-5 text-pop" />
              Add income or expense
            </CardTitle>
            <CardDescription>
              Transactions are saved to your active couple workspace: {profile?.activeCouple?.name ?? "Personal workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreateTransaction}>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-white/70">Type</span>
                  <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value as "EXPENSE" | "INCOME")}
                    className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-white/70">Amount</span>
                  <input
                    required
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="45000"
                    className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-white/70">Category</span>
                <input
                  required
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="groceries / salary"
                  className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-white/70">Note (optional)</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="short context"
                  className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                />
              </label>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmittingTx}>
                  {isSubmittingTx ? "Saving..." : "Save transaction"}
                </Button>
                {txMessage ? <p className="text-sm text-emerald-200">{txMessage}</p> : null}
                {txError ? <p className="text-sm text-rose-200">{txError}</p> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-5 text-pop" />
              Connect partner by code
            </CardTitle>
            <CardDescription>
              Share your code <span className="font-semibold text-white">{profile?.user.coupleCode}</span> and enter your partner&apos;s code below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onBind}>
              <label className="space-y-1 text-sm">
                <span className="text-white/70">Partner code</span>
                <input
                  required
                  value={bindCode}
                  onChange={(event) => setBindCode(event.target.value.toUpperCase())}
                  placeholder="AB12CD"
                  className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                />
              </label>

              <div className="flex items-center gap-3">
                <Button type="submit" variant="outline" disabled={isBinding}>
                  {isBinding ? "Connecting..." : "Connect"}
                </Button>
                {bindMessage ? <p className="text-sm text-emerald-200">{bindMessage}</p> : null}
                {bindError ? <p className="text-sm text-rose-200">{bindError}</p> : null}
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/70">
                <p>Active workspace: {profile?.activeCouple?.name ?? "None"}</p>
                <p>Role: {profile?.activeCouple?.role ?? "-"}</p>
                <p>Last linked code: {profile?.bind?.insertedCode ?? "Not linked yet"}</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="size-5 text-pop" />
              Recent activity
            </CardTitle>
            <CardDescription>Latest 20 transactions from your active workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <p className="text-sm text-white/70">Refreshing...</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-white/70">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((item) => {
                  const amountNumber = Number(item.amount);
                  const amountClass = item.kind === "INCOME" ? "text-emerald-200" : "text-rose-200";
                  const actor = item.user.firstName ?? item.user.username ?? "Member";

                  return (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{item.category.name}</p>
                          <p className={`font-semibold ${amountClass}`}>
                            {item.kind === "INCOME" ? "+" : "-"}
                            {amountNumber.toLocaleString()} UZS
                          </p>
                        </div>
                        <p className="text-xs text-white/65">
                          {actor} · {item.note ?? "No note"} · {new Date(item.happenedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => startEditing(item)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isDeletingId === item.id}
                          onClick={() => void onDeleteTransaction(item.id)}
                        >
                          <Trash2 className="size-3.5" />
                          {isDeletingId === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {editingTransaction ? (
        <section className="mt-6">
          <Card className="border-white/20 bg-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="size-5 text-pop" />
                Edit transaction
              </CardTitle>
              <CardDescription>Adjust only your own saved transaction.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onSaveEdit}>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm">
                    <span className="text-white/70">Type</span>
                    <select
                      value={editingTransaction.kind}
                      onChange={(event) =>
                        setEditingTransaction((current) => (current ? { ...current, kind: event.target.value as "EXPENSE" | "INCOME" } : current))
                      }
                      className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                    >
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-white/70">Amount</span>
                    <input
                      required
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={editingTransaction.amount}
                      onChange={(event) => setEditingTransaction((current) => (current ? { ...current, amount: event.target.value } : current))}
                      className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                    />
                  </label>
                </div>

                <label className="space-y-1 text-sm">
                  <span className="text-white/70">Category</span>
                  <input
                    required
                    value={editingTransaction.categoryName}
                    onChange={(event) => setEditingTransaction((current) => (current ? { ...current, categoryName: event.target.value } : current))}
                    className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-white/70">Note</span>
                  <input
                    value={editingTransaction.note}
                    onChange={(event) => setEditingTransaction((current) => (current ? { ...current, note: event.target.value } : current))}
                    className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isSavingEdit}>
                    {isSavingEdit ? "Saving..." : "Save changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingTransaction(null)}>
                    <X className="size-4" />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
