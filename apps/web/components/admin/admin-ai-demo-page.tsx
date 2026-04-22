"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Camera, LogOut, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { webEnv } from "@/lib/env";

type AdminMeResponse = {
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminUserListItem = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  bind: {
    coupleId: string;
    insertedCode: string;
    updatedAt: string;
    couple: {
      id: string;
      name: string;
    };
  } | null;
  memberships: Array<{
    role: string;
    couple: {
      id: string;
      name: string;
    };
  }>;
};

type AdminUsersResponse = {
  items: AdminUserListItem[];
};

type AdminAiDemoStep = {
  key: string;
  title: string;
  explanation: string;
  status: "DONE" | "REVIEW" | "BLOCKED";
  output: unknown;
};

type AdminAiDemoResponse = {
  steps: AdminAiDemoStep[];
  finalDraft: unknown;
  writePreview: unknown;
};

type AdminAiDemoPreprocessStage = {
  key: "original" | "cleaned" | "textEnhanced";
  title: string;
  description: string;
  mimeType: string;
  dataUrl: string;
  usedForExtraction: "PRIMARY" | "SECONDARY" | "NONE";
};

type AdminAiDemoPreprocessOutput = {
  previewStages: AdminAiDemoPreprocessStage[];
  preprocessingApplied: string[];
  localQualityIssues: string[];
  primaryImageMimeType: string;
  secondaryImageMimeType: string | null;
  includesSecondaryImage: boolean;
  modelInputStages: {
    primary: string | null;
    secondary: string | null;
  };
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let message = `Request failed with status ${response.status}`;
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      message = payload.message.join(", ");
    } else if (payload.message) {
      message = payload.message;
    }
  } catch {}

  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPreprocessStage(value: unknown): value is AdminAiDemoPreprocessStage {
  return (
    isRecord(value) &&
    (value.key === "original" || value.key === "cleaned" || value.key === "textEnhanced") &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.mimeType === "string" &&
    typeof value.dataUrl === "string" &&
    (value.usedForExtraction === "PRIMARY" ||
      value.usedForExtraction === "SECONDARY" ||
      value.usedForExtraction === "NONE")
  );
}

function isPreprocessOutput(value: unknown): value is AdminAiDemoPreprocessOutput {
  return (
    isRecord(value) &&
    Array.isArray(value.previewStages) &&
    value.previewStages.every(isPreprocessStage) &&
    isStringArray(value.preprocessingApplied) &&
    isStringArray(value.localQualityIssues) &&
    typeof value.primaryImageMimeType === "string" &&
    (typeof value.secondaryImageMimeType === "string" || value.secondaryImageMimeType === null) &&
    typeof value.includesSecondaryImage === "boolean" &&
    isRecord(value.modelInputStages) &&
    (typeof value.modelInputStages.primary === "string" || value.modelInputStages.primary === null) &&
    (typeof value.modelInputStages.secondary === "string" || value.modelInputStages.secondary === null)
  );
}

function formatUserLabel(user: AdminUserListItem) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (name) {
    return `${name}${user.email ? ` · ${user.email}` : ""}`;
  }

  if (user.username) {
    return `@${user.username}${user.email ? ` · ${user.email}` : ""}`;
  }

  return user.email ?? user.id;
}

function formatExtractionUsageLabel(value: AdminAiDemoPreprocessStage["usedForExtraction"]) {
  if (value === "PRIMARY") {
    return "Sent to the model as the primary receipt image";
  }

  if (value === "SECONDARY") {
    return "Sent to the model as the secondary support image";
  }

  return "Generated for visual review only";
}

function StepStatusBadge({ status }: { status: AdminAiDemoStep["status"] }) {
  const className =
    status === "DONE"
      ? "border border-[rgba(122,158,126,0.24)] bg-[color-mix(in_srgb,var(--sage)_10%,transparent)] text-[var(--ink)]"
      : status === "REVIEW"
        ? "border border-[rgba(201,168,76,0.22)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--ink)]"
        : "border border-red-300/30 bg-red-500/10 text-red-700 dark:text-red-100";

  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`}>{status}</span>;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-[rgba(201,168,76,0.14)] bg-[color-mix(in_srgb,var(--warm-white)_60%,transparent)] p-4 text-xs leading-6 text-[var(--ink)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function TokenList({
  items,
  emptyLabel
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--warm-white)_70%,transparent)] px-3 py-1 text-xs font-medium text-[var(--ink)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PreprocessStepOutput({ output }: { output: AdminAiDemoPreprocessOutput }) {
  const metadataSnapshot = {
    previewStages: output.previewStages.map(({ dataUrl, ...stage }) => ({
      ...stage,
      hasInlinePreview: Boolean(dataUrl)
    })),
    preprocessingApplied: output.preprocessingApplied,
    localQualityIssues: output.localQualityIssues,
    primaryImageMimeType: output.primaryImageMimeType,
    secondaryImageMimeType: output.secondaryImageMimeType,
    includesSecondaryImage: output.includesSecondaryImage,
    modelInputStages: output.modelInputStages
  };

  return (
    <div className="space-y-5">
      {output.previewStages.length > 0 ? (
        output.previewStages.map((stage) => (
          <section
            key={stage.key}
            className="space-y-3 rounded-2xl border border-[rgba(201,168,76,0.14)] bg-[color-mix(in_srgb,var(--warm-white)_55%,transparent)] p-4"
          >
            <div className="space-y-1">
              <p className="field-label">{stage.title}</p>
              <p className="text-sm leading-6 text-[var(--ink-soft)]">{stage.description}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                {formatExtractionUsageLabel(stage.usedForExtraction)}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[rgba(201,168,76,0.14)] bg-white">
              <img
                src={stage.dataUrl}
                alt={stage.title}
                className="h-auto w-full object-contain"
              />
            </div>
          </section>
        ))
      ) : (
        <p className="text-sm text-[var(--ink-soft)]">
          Preview images were not available for this run, but the preprocessing metadata below still reflects the live pipeline result.
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-[rgba(201,168,76,0.14)] bg-[var(--card-bg)] p-4">
        <div className="space-y-2">
          <p className="field-label">Preprocessing operations</p>
          <TokenList
            items={output.preprocessingApplied}
            emptyLabel="No preprocessing operations were recorded."
          />
        </div>

        <div className="space-y-2">
          <p className="field-label">Quality issues detected</p>
          <TokenList
            items={output.localQualityIssues}
            emptyLabel="No local image-quality issues were detected."
          />
        </div>

        <div className="space-y-1 text-sm leading-6 text-[var(--ink-soft)]">
          <p>
            <span className="font-medium text-[var(--ink)]">Primary model input:</span>{" "}
            {output.modelInputStages.primary ?? "Unavailable"}
          </p>
          <p>
            <span className="font-medium text-[var(--ink)]">Secondary model input:</span>{" "}
            {output.modelInputStages.secondary ?? "None"}
          </p>
          <p>
            <span className="font-medium text-[var(--ink)]">Primary image MIME type:</span>{" "}
            {output.primaryImageMimeType}
          </p>
          <p>
            <span className="font-medium text-[var(--ink)]">Secondary image MIME type:</span>{" "}
            {output.secondaryImageMimeType ?? "None"}
          </p>
        </div>
      </section>

      <details className="rounded-2xl border border-[rgba(201,168,76,0.14)] bg-[var(--card-bg)] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[var(--ink)]">
          Preprocess metadata
        </summary>
        <div className="mt-3">
          <JsonBlock value={metadataSnapshot} />
        </div>
      </details>
    </div>
  );
}

export function AdminAiDemoPage() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);

  const [authState, setAuthState] = useState<"loading" | "login" | "ready">("loading");
  const [admin, setAdmin] = useState<AdminMeResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoResult, setDemoResult] = useState<AdminAiDemoResponse | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [isRunningDemo, setIsRunningDemo] = useState(false);

  const selectedWorkspace = useMemo(() => {
    if (!selectedUser) {
      return null;
    }

    return selectedUser.bind?.couple ?? selectedUser.memberships[0]?.couple ?? null;
  }, [selectedUser]);

  const loadAdminSession = async () => {
    try {
      const payload = await fetch(`${webEnv.apiUrl}/0admin/me`, {
        credentials: "include"
      }).then((response) => parseApiResponse<AdminMeResponse>(response));
      setAdmin(payload);
      setAuthError(null);
      setAuthState("ready");
    } catch (error) {
      setAdmin(null);
      setAuthState("login");
      setAuthError(error instanceof Error ? error.message : "Could not restore admin session");
    }
  };

  useEffect(() => {
    void loadAdminSession();
  }, []);

  useEffect(() => {
    if (authState !== "ready") {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsSearchingUsers(true);
      setUserSearchError(null);

      void fetch(
        `${webEnv.apiUrl}/0admin/users?search=${encodeURIComponent(searchQuery)}&page=1&pageSize=8`,
        {
          credentials: "include",
          signal: controller.signal
        }
      )
        .then((response) => parseApiResponse<AdminUsersResponse>(response))
        .then((payload) => {
          setUsers(payload.items);
          setSelectedUser((current) => {
            if (!current) {
              return payload.items[0] ?? null;
            }

            return payload.items.find((item) => item.id === current.id) ?? current;
          });
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          setUserSearchError(error instanceof Error ? error.message : "Could not load users");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearchingUsers(false);
          }
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [authState, searchQuery]);

  const onSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingLogin(true);
    setAuthError(null);

    try {
      await fetch(`${webEnv.apiUrl}/0admin/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      }).then((response) => parseApiResponse<{ admin: { email: string } }>(response));

      setPassword("");
      await loadAdminSession();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign in");
      setAuthState("login");
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const onLogout = async () => {
    try {
      await fetch(`${webEnv.apiUrl}/0admin/logout`, {
        method: "POST",
        credentials: "include"
      });
    } finally {
      setAdmin(null);
      setUsers([]);
      setSelectedUser(null);
      setSelectedFile(null);
      setDemoResult(null);
      setAuthState("login");
    }
  };

  const onPickFile = (file: File | null) => {
    setSelectedFile(file);
    setDemoResult(null);
    setDemoError(null);
  };

  const onRunDemo = async () => {
    if (!selectedUser || !selectedFile) {
      return;
    }

    setIsRunningDemo(true);
    setDemoError(null);
    setDemoResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile, selectedFile.name);

      const payload = await fetch(
        `${webEnv.apiUrl}/0admin/ai-demo/image-draft?targetUserId=${encodeURIComponent(selectedUser.id)}`,
        {
          method: "POST",
          credentials: "include",
          body: formData
        }
      ).then((response) => parseApiResponse<AdminAiDemoResponse>(response));

      setDemoResult(payload);
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : "Could not run AI demo");
    } finally {
      setIsRunningDemo(false);
    }
  };

  if (authState === "loading") {
    return (
      <main className="container-shell pb-16 pt-20">
        <Card>
          <CardHeader>
            <CardTitle>Admin AI Demo</CardTitle>
            <CardDescription>Checking the current admin session.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (authState === "login") {
    return (
      <main className="container-shell pb-16 pt-20">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Sign in to open the image extraction demo for the professor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmitLogin}>
              <label className="space-y-1 text-sm">
                <span className="field-label">Admin email</span>
                <TextField
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">Password</span>
                <TextField
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                />
              </label>
              {authError ? <p className="status-error text-sm">{authError}</p> : null}
              <Button type="submit" pending={isSubmittingLogin} pendingText="Signing in...">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container-shell space-y-6 pb-16 pt-20">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="eyebrow-row">Administrative demo</p>
          <h1 className="font-[family-name:var(--font-heading)] text-[clamp(34px,5vw,52px)] font-light leading-[1.05]">
            Image Extraction Walkthrough
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            This page runs the real receipt-image extraction pipeline, but each explanation is fixed and deterministic.
            The output stops at preview mode and does not write anything to the database.
          </p>
        </div>

        <div className="rounded-xl border border-[rgba(201,168,76,0.14)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--ink-soft)]">
          <p className="font-medium text-[var(--ink)]">{admin?.email}</p>
          <p className="mt-1">Active admin session</p>
          <div className="mt-3">
            <Button type="button" variant="outline" onClick={onLogout}>
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
          <CardDescription>
            Select a real app user context, choose one image, and run the dry-run extraction demo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <section className="space-y-3">
            <label className="space-y-1 text-sm">
              <span className="field-label">Search user context</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-soft)]" />
                <TextField
                  className="pl-10"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, email, or username"
                />
              </div>
            </label>
            {isSearchingUsers ? (
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">Loading users</p>
            ) : null}
            {userSearchError ? <p className="status-error text-sm">{userSearchError}</p> : null}
            <div className="space-y-2">
              {users.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]"
                        : "border-[rgba(201,168,76,0.14)] bg-[var(--card-bg)] hover:border-[rgba(201,168,76,0.3)]"
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <p className="text-sm font-medium text-[var(--ink)]">{formatUserLabel(user)}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                      Workspace: {user.bind?.couple.name ?? user.memberships[0]?.couple.name ?? "No active workspace"}
                    </p>
                  </button>
                );
              })}
              {!isSearchingUsers && users.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">No users matched the current search.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-[rgba(201,168,76,0.14)] bg-[var(--card-bg)] p-4">
            <div>
              <p className="field-label">Selected user</p>
              <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                {selectedUser ? formatUserLabel(selectedUser) : "Select a user context"}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Active workspace: {selectedWorkspace?.name ?? "Unavailable"}
              </p>
            </div>

            <div className="space-y-3">
              <p className="field-label">Image source</p>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                className="hidden"
                onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
              />
              <input
                ref={captureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
              />
              <div className="space-y-3">
                <Button type="button" variant="outline" className="w-full justify-center" onClick={() => uploadInputRef.current?.click()}>
                  <Upload className="size-4" />
                  Upload image
                </Button>
                <Button type="button" variant="outline" className="w-full justify-center" onClick={() => captureInputRef.current?.click()}>
                  <Camera className="size-4" />
                  Capture image
                </Button>
              </div>
              <p className="text-sm text-[var(--ink-soft)]">
                {selectedFile ? `Selected file: ${selectedFile.name}` : "No image selected yet."}
              </p>
            </div>

            <Button
              type="button"
              className="w-full justify-center"
              onClick={onRunDemo}
              pending={isRunningDemo}
              pendingText="Running demo..."
              disabled={!selectedUser || !selectedFile || isRunningDemo}
            >
              Run professor demo
            </Button>

            {demoError ? <p className="status-error text-sm">{demoError}</p> : null}
          </section>
        </CardContent>
      </Card>

      {demoResult ? (
        <div className="space-y-4">
          <Card className="border-[rgba(122,158,126,0.24)] bg-[color-mix(in_srgb,var(--sage)_8%,var(--card-bg))]">
            <CardHeader>
              <CardTitle>No Write Performed</CardTitle>
              <CardDescription>
                This demo ran the live extraction pipeline and produced a write preview only. No data was written to the database.
              </CardDescription>
            </CardHeader>
          </Card>

          {demoResult.steps.map((step) => (
            <Card key={step.key}>
              <CardHeader>
                <div className="space-y-3">
                  <div>
                    <CardTitle className="text-[22px]">{step.title}</CardTitle>
                    <CardDescription>{step.explanation}</CardDescription>
                  </div>
                  <StepStatusBadge status={step.status} />
                </div>
              </CardHeader>
              <CardContent>
                {step.key === "preprocess" && isPreprocessOutput(step.output) ? (
                  <PreprocessStepOutput output={step.output} />
                ) : (
                  <JsonBlock value={step.output} />
                )}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>UI Draft Preview</CardTitle>
              <CardDescription>
                These are the exact fields the current image AI flow would place into the transaction form.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JsonBlock value={demoResult.finalDraft} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DB Write Preview</CardTitle>
              <CardDescription>
                This shows the Transaction record that would be written by the normal save flow for the selected user context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JsonBlock value={demoResult.writePreview} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
