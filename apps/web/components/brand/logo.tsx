import type { CSSProperties } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { cn } from "@/lib/cn";

/**
 * Single definition of the Duet brand mark.
 *
 * Two variants, deliberately built differently:
 *
 * - `wordmark` renders live DOM text in the brand serif plus the gold accent dot.
 *   Text stays crisp at any size, inherits the current theme's ink colour, and is
 *   selectable and readable by screen readers. An SVG loaded through <img> cannot
 *   do any of that: it is font-isolated, so the wordmark would fall back to a
 *   generic serif on machines without Cormorant Garamond installed.
 *
 * - `icon` renders the square logo asset, because that is the form that has to
 *   work at 32px, inside a favicon, and as an app icon — places where text does
 *   not survive. Until the asset exists it falls back to a CSS monogram, so the
 *   UI never shows a broken image.
 *
 * To change the mark everywhere, replace the file at BRAND_ICON_SRC. No component
 * changes required.
 */
export const BRAND_ICON_SRC = "/brand/icon.svg";

export type LogoVariant = "wordmark" | "icon";

type LogoProps = {
  variant?: LogoVariant;
  /** Rendered size of the square icon in px. Ignored by the wordmark, which scales with its font size. */
  size?: number;
  className?: string;
  /** Wraps the mark in a link. Pass null for a decorative, non-navigating mark. */
  href?: string | null;
  label?: string;
  /** The pulsing gold accent next to the wordmark. */
  showDot?: boolean;
  /** Set when a nearby element already names the app, so the mark is not announced twice. */
  decorative?: boolean;
};

export function Logo({
  variant = "wordmark",
  size = 32,
  className,
  href = "/",
  label = "Duet",
  showDot = true,
  decorative = false
}: LogoProps) {
  const content =
    variant === "icon" ? (
      <BrandIcon size={size} label={label} decorative={decorative} />
    ) : (
      <>
        <span>{label}</span>
        {showDot ? <span className="logo-dot" aria-hidden="true" /> : null}
      </>
    );

  const rootClassName = cn(variant === "icon" ? "logo-icon-root" : "logo-mark", className);

  if (href) {
    // Exactly one source for the accessible name. The wordmark's visible text and
    // the icon's role="img" already name themselves, so labelling the link too
    // would announce it twice. The one gap is a decorative icon inside a link:
    // its content is hidden from assistive tech, so the link needs the name.
    const needsLinkLabel = variant === "icon" && decorative;

    return (
      <AppLink className={rootClassName} href={href} aria-label={needsLinkLabel ? label : undefined}>
        {content}
      </AppLink>
    );
  }

  return <div className={rootClassName}>{content}</div>;
}

function BrandIcon({ size, label, decorative }: { size: number; label: string; decorative: boolean }) {
  return (
    // The asset is a CSS background layer rather than an <img> on purpose: a
    // missing background simply does not paint, leaving the monogram visible,
    // whereas a missing <img> src renders a broken-image glyph.
    <span
      className="logo-icon"
      // fontSize is set here so the fallback monogram, sized in em, scales with the
      // box instead of inheriting an unrelated size from whatever contains it.
      style={{ width: size, height: size, fontSize: size, "--logo-icon-src": `url(${BRAND_ICON_SRC})` } as CSSProperties}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
    >
      <span className="logo-icon-fallback" aria-hidden="true">
        {label.charAt(0)}
      </span>
    </span>
  );
}
