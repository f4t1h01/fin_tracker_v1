"use client";

import { Pin, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/cn";

import { AgentIconButton } from "./agent-icon-button";
import type { AgentThreadSummary } from "./types";

const dayMs = 86_400_000;
const starredLabel = "Starred";
const bucketOrder = [starredLabel, "Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Earlier"] as const;

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function bucketFor(summary: AgentThreadSummary, todayStart: number) {
  if (summary.isPinned) {
    return starredLabel;
  }

  const time = new Date(summary.updatedAt).getTime();
  if (Number.isNaN(time) || time < todayStart - dayMs * 30) {
    return "Earlier";
  }

  if (time >= todayStart) {
    return "Today";
  }

  if (time >= todayStart - dayMs) {
    return "Yesterday";
  }

  if (time >= todayStart - dayMs * 7) {
    return "Previous 7 days";
  }

  return "Previous 30 days";
}

type AgentThreadListProps = {
  summaries: AgentThreadSummary[];
  hasThreads: boolean;
  activeThreadId: string | null;
  onOpen: (threadId: string) => void;
  onTogglePinned: (threadId: string) => void;
  onDelete: (threadId: string) => void;
};

export function AgentThreadList({
  summaries,
  hasThreads,
  activeThreadId,
  onOpen,
  onTogglePinned,
  onDelete
}: AgentThreadListProps) {
  const groups = useMemo(() => {
    const todayStart = startOfToday();
    const byLabel = new Map<string, AgentThreadSummary[]>();

    for (const summary of summaries) {
      const label = bucketFor(summary, todayStart);
      const items = byLabel.get(label);

      if (items) {
        items.push(summary);
      } else {
        byLabel.set(label, [summary]);
      }
    }

    return bucketOrder.flatMap((label) => {
      const items = byLabel.get(label);
      return items?.length ? [{ label, items }] : [];
    });
  }, [summaries]);

  if (!summaries.length) {
    return (
      <p className="px-3 py-6 text-[12px] leading-5 text-[var(--ink-soft)]">
        {hasThreads ? "No conversations match that search." : "Your conversations will show up here."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.label} className="space-y-1.5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--ink-soft)_80%,transparent)]">
            {group.label}
          </p>

          <div className="space-y-1">
            {group.items.map((summary) => {
              const isActive = summary.id === activeThreadId;

              return (
                <div key={summary.id} className="group relative">
                  <button
                    type="button"
                    title={summary.title}
                    onClick={() => onOpen(summary.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      // The right padding permanently reserves room for the row
                      // actions, so revealing them never reflows the title.
                      "w-full rounded-[14px] border py-2 pl-3 pr-[68px] text-left transition-[background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      isActive
                        ? "border-[color-mix(in_srgb,var(--gold)_60%,transparent)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]"
                        : "border-transparent hover:border-[rgba(201,168,76,0.18)] hover:bg-[color-mix(in_srgb,var(--warm-white)_62%,transparent)]"
                    )}
                  >
                    <span className={cn("block truncate text-[13px]", isActive ? "font-semibold text-[var(--ink)]" : "text-[var(--ink)]")}>
                      {summary.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] leading-4 text-[var(--ink-soft)]">{summary.preview}</span>
                  </button>

                  <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <AgentIconButton
                      icon={Pin}
                      size="sm"
                      label={summary.isPinned ? "Unstar conversation" : "Star conversation"}
                      onClick={() => onTogglePinned(summary.id)}
                      className={cn(
                        "pointer-events-auto transition-opacity",
                        summary.isPinned
                          ? "border-[rgba(201,168,76,0.32)] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-[var(--gold)] opacity-100"
                          : "border-transparent bg-transparent opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                      )}
                    />
                    <AgentIconButton
                      icon={Trash2}
                      size="sm"
                      label="Delete conversation"
                      onClick={() => onDelete(summary.id)}
                      className="pointer-events-auto border-transparent bg-transparent opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
