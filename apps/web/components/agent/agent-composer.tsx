"use client";

import { ArrowUp, Loader2, Mic, Paperclip } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { AgentIconButton } from "./agent-icon-button";

/** Roughly seven lines before the box starts scrolling instead of growing. */
const composerMaxHeight = 208;

/**
 * Touch keyboards put Enter where a newline belongs, so a hardware keyboard gets
 * "Enter sends" and a touch device gets the send button instead.
 */
function useHasFinePointer() {
  const [hasFinePointer, setHasFinePointer] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const sync = () => setHasFinePointer(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return hasFinePointer;
}

type AgentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isThinking: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
};

export function AgentComposer({
  value,
  onChange,
  onSubmit,
  isThinking,
  autoFocus = false,
  placeholder = "Ask anything, or tell me what to record...",
  className
}: AgentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const lastWidthRef = useRef(0);
  const hasFinePointer = useHasFinePointer();
  const canSend = value.trim().length > 0 && !isThinking;

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 28;
    const framing = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const singleRow = lineHeight + framing;

    // An empty box has to stay exactly one row tall. Chrome measures an empty
    // textarea's scrollHeight from its placeholder, which wraps on narrow
    // layouts and would open the composer three rows deep before a single
    // character is typed.
    const nextHeight = textarea.value
      ? Math.min(Math.max(textarea.scrollHeight, singleRow), composerMaxHeight)
      : singleRow;

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.value && textarea.scrollHeight > composerMaxHeight ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [resize, value]);

  // A draft that wraps at one width wraps differently at another: collapsing the
  // sidebar or rotating a phone has to re-measure, not keep a stale height.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width === lastWidthRef.current) {
        return;
      }

      lastWidthRef.current = width;
      resize();
    });

    observer.observe(box);
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    if (autoFocus && hasFinePointer) {
      textareaRef.current?.focus();
    }
  }, [autoFocus, hasFinePointer]);

  const submit = useCallback(() => {
    if (!canSend) {
      return;
    }

    onSubmit();
    textareaRef.current?.focus();
  }, [canSend, onSubmit]);

  return (
    <form
      className={cn("w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div
        ref={boxRef}
        className="rounded-[26px] border border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--warm-white)_88%,transparent)] px-2.5 pb-2 pt-2.5 shadow-[0_18px_44px_rgba(26,20,16,0.08)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 focus-within:border-[color-mix(in_srgb,var(--gold)_70%,transparent)] focus-within:shadow-[0_22px_54px_rgba(201,168,76,0.16)]">
        <label className="sr-only" htmlFor="agent-composer-input">
          Message the AI Agent
        </label>
        <textarea
          id="agent-composer-input"
          ref={textareaRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || !hasFinePointer || event.nativeEvent.isComposing) {
              return;
            }

            event.preventDefault();
            submit();
          }}
          className="block max-h-[208px] w-full resize-none border-none bg-transparent px-2.5 py-2 text-[15px] leading-7 text-[var(--ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--ink-soft)_72%,transparent)]"
          style={{ resize: "none" }}
        />

        <div className="mt-1 flex items-center justify-between gap-2 pl-1 pr-0.5">
          <div className="flex items-center gap-1">
            <AgentIconButton icon={Paperclip} label="Attach a receipt (coming soon)" disabled />
            <AgentIconButton icon={Mic} label="Speak instead of typing (coming soon)" disabled />
          </div>

          <div className="flex items-center gap-3">
            {hasFinePointer ? (
              <span className="hidden text-[11px] uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--ink-soft)_78%,transparent)] md:inline">
                Enter to send
              </span>
            ) : null}

            <button
              type="submit"
              disabled={!canSend}
              title={isThinking ? "Replying" : "Send message"}
              aria-label={isThinking ? "Replying" : "Send message"}
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform,box-shadow] duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                canSend
                  ? "border-transparent bg-[var(--ink)] text-[var(--cream)] shadow-[0_12px_26px_rgba(26,20,16,0.18)] hover:scale-[1.04] active:scale-95"
                  : "cursor-not-allowed border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--warm-white)_58%,transparent)] text-[color-mix(in_srgb,var(--ink-soft)_60%,transparent)]"
              )}
            >
              {isThinking ? <Loader2 className="size-[18px] animate-spin" /> : <ArrowUp className="size-[18px]" />}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
