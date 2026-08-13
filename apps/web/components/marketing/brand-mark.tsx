import { AppLink } from "@/components/navigation/app-link";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
  href?: string;
  label?: string;
};

export function BrandMark({ className, href = "/", label = "Duet" }: BrandMarkProps) {
  const content = (
    <>
      <span>{label}</span>
      <span className="logo-dot" />
    </>
  );

  if (href) {
    return (
      <AppLink className={cn("logo-mark", className)} href={href}>
        {content}
      </AppLink>
    );
  }

  return <div className={cn("logo-mark", className)}>{content}</div>;
}
