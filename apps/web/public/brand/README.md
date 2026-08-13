# Brand assets

## Drop your logo here

Put the square logo at:

```
apps/web/public/brand/icon.svg
```

That single file is what `<Logo variant="icon" />` paints, via the `BRAND_ICON_SRC`
constant in `apps/web/components/brand/logo.tsx`. Nothing else needs editing.

Until the file exists, the icon variant falls back to a gold `D` monogram — the UI
degrades quietly instead of showing a broken image, so it is safe to merge the
component before the artwork lands.

### Requirements

| Property | Value |
| --- | --- |
| Format | SVG preferred. PNG works if it is at least 1024×1024. |
| Aspect | Square (1:1). Non-square art gets letterboxed by `background-size: contain`. |
| Background | Transparent. The component supplies its own rounded container. |
| Safe area | Keep the mark inside the central ~80%. Android and iOS crop app icons to a circle or squircle. |
| Colour | Must stay legible on both `#faf6ee` (light) and `#12100d` (dark). If it only works on one, ship two files and branch in the component. |

If you also have a horizontal lockup, it is **not** needed: `<Logo variant="wordmark" />`
renders "Duet" as live text in Cormorant Garamond plus the gold dot, which stays
sharp at any size, follows the active theme, and remains selectable. An SVG loaded
through a CSS background or `<img>` is font-isolated and would fall back to a
generic serif on machines without the font.

## Not wired up yet

These still use defaults and were left out of this change on purpose — say the
word and they can be generated from `icon.svg` in one pass:

- `apps/web/app/favicon.ico` is still the default 16×16 Next.js icon.
- No `apple-icon`, no PWA `manifest`, no `opengraph-image` (link previews in
  Telegram and social apps currently show nothing).
- Android still ships `@android:drawable/sym_def_app_icon`, the stock system
  placeholder — there is no `res/mipmap-*` directory at all.
- The OTP email header is plain Georgia text (`apps/api/src/modules/common/email-template.ts`).

`sharp` is already available transitively through Next.js, so rasterising
`icon.svg` into every required size can be scripted without new dependencies.

## Usage

```tsx
import { Logo } from "@/components/brand/logo";

<Logo />                                   // wordmark, links to /
<Logo variant="icon" size={32} />          // square mark
<Logo variant="icon" size={48} href={null} decorative />  // no link, not announced
<Logo showDot={false} />                   // wordmark without the pulsing accent
```
