import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

type AgentMarkProps = {
  size?: number;
  className?: string;
};

/**
 * The agent's face: the Duet brand mark in a gold halo. Built on <Logo> so the
 * day the icon asset lands, the avatar, the sidebar and the welcome screen all
 * pick it up at once.
 */
export function AgentMark({ size = 32, className }: AgentMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-[rgba(201,168,76,0.3)] bg-[color-mix(in_srgb,var(--gold)_14%,var(--warm-white))] shadow-[0_8px_20px_rgba(26,20,16,0.08)]",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Logo variant="icon" size={Math.round(size * 0.6)} href={null} decorative />
    </span>
  );
}
