# Duet — Design System & Theme Specification

> A complete guide to the visual language, component library, theming rules, and landing page structure for the **Duet** couple finance product. Use this document as the single source of truth when building or extending any part of the UI.

---

## 1. Design Philosophy

The aesthetic is **warm editorial luxury** — the kind of feeling you get from a beautifully printed finance magazine or a high-end personal banking app. Think quiet confidence, not loud startup energy.

Key principles:
- **Warmth over coldness.** Cream and ink replace white and black. Every surface feels like paper, not a screen.
- **Restraint with intention.** Generous whitespace, minimal decoration — but when details appear (a gold dot, a 1px rule, an italic word), they are deliberate and precise.
- **Motion as atmosphere.** Animations are slow, floaty, and organic. Nothing snaps. Everything breathes.
- **Typography leads.** The serif display font carries the emotional weight. The sans-serif body font stays out of the way.
- **Two people, one picture.** Every design decision should subtly reinforce partnership — paired elements, mirrored layouts, connecting visual metaphors.

---

## 2. Color Palette

All colors are defined as design tokens. **Never hardcode hex values** — always reference a token. This is what makes light/dark switching effortless.

### 2.1 Token Names & Values

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--cream` | `#F5F0E8` | `#12100E` | Page background |
| `--warm-white` | `#FAF7F2` | `#1A1714` | Card / surface background |
| `--ink` | `#1A1410` | `#F0EBE1` | Primary text, buttons, headings |
| `--ink-soft` | `#3D3530` | `#B0A898` | Secondary text, labels, captions |
| `--blush` | `#E8C4B0` | `#2A1F18` | Accent surface (testimonial bg, decorative fills) |
| `--blush-deep` | `#C9896A` | `#E09A74` | Italic accent on headings, negative amounts |
| `--sage` | `#7A9E7E` | `#8AB98E` | Positive amounts, success states, badges |
| `--gold` | `#C9A84C` | `#D4B05A` | Primary accent — eyebrows, underlines, borders, dots |
| `--gold-light` | `#E8D5A3` | `#3A2E14` | Gold tint used for hover fills |
| `--card-bg` | `rgba(250,247,242,0.7)` | `rgba(26,23,20,0.7)` | Glassmorphic / frosted card |
| `--nav-bg` | `rgba(245,240,232,0.6)` | `rgba(18,16,14,0.6)` | Nav bar at top of page |
| `--nav-bg-scroll` | `rgba(245,240,232,0.85)` | `rgba(18,16,14,0.92)` | Nav bar after scrolling |
| `--stat-bg` | `#FAF7F2` | `#1A1714` | Stats section tile background |
| `--testimonial-bg` | `#E8C4B0` | `#1E1612` | Testimonial section background |
| `--testimonial-quote` | `rgba(26,20,16,0.06)` | `rgba(240,235,225,0.04)` | Decorative background quote mark |
| `--connect-card-bg` | `#FAF7F2` | `#1A1714` | Couple connect card background |

### 2.2 Semantic Color Usage

- **Backgrounds** → `--cream` (page), `--warm-white` (cards/sections)
- **Text** → `--ink` (headings, body), `--ink-soft` (secondary, captions)
- **Accents** → `--gold` (all decorative gold: lines, dots, borders, eyebrow text)
- **Emotion** → `--blush-deep` (italic highlights in headlines, expense amounts)
- **Status** → `--sage` (positive/income), `--blush-deep` (negative/expense)
- **Dark overlays** → always use `var(--ink)` with opacity adjustments, never black

### 2.3 Raw Palette Reference (for design tools)

```
Cream:       #F5F0E8   Warm White:  #FAF7F2
Ink:         #1A1410   Ink Soft:    #3D3530
Blush:       #E8C4B0   Blush Deep:  #C9896A
Sage:        #7A9E7E   Gold:        #C9A84C
Gold Light:  #E8D5A3

Dark Cream:  #12100E   Dark Surface: #1A1714
Dark Ink:    #F0EBE1   Dark Ink Soft:#B0A898
Dark Blush:  #2A1F18   Dark Blush D: #E09A74
Dark Sage:   #8AB98E   Dark Gold:    #D4B05A
```

---

## 3. Typography

### 3.1 Font Families

Two typefaces only — never introduce a third.

| Role | Family | Weights Used | Character |
|---|---|---|---|
| **Display / Serif** | Cormorant Garamond | 300, 400, 600 + italic variants | Elegant, editorial, emotional |
| **Body / Sans** | DM Sans | 300, 400, 500 | Clean, neutral, legible |

Import:
```
Cormorant Garamond: weights 300, 400, 600 — normal + italic
DM Sans: weights 300, 400, 500
```

### 3.2 Type Scale

| Element | Family | Size | Weight | Line-height | Letter-spacing | Notes |
|---|---|---|---|---|---|---|
| `h1` (Hero) | Cormorant Garamond | `clamp(52px, 6vw, 88px)` | 300 | 1.05 | -0.01em | `em` tags become italic + `--blush-deep` |
| `h2` (Section) | Cormorant Garamond | `clamp(36px, 4vw, 56px)` | 300 | 1.1 | — | `em` tags become italic + `--blush-deep` |
| `h3` (Card title) | Cormorant Garamond | 26px | 400 | 1.2 | — | |
| `h4` (Step title) | Cormorant Garamond | 22px | 400 | — | — | |
| `h5` (Footer heading) | DM Sans | 11px | — | — | 0.2em | Uppercase, `--gold` |
| Body text | DM Sans | 14–16px | 300 | 1.7 | — | |
| Eyebrow label | DM Sans | 11px | — | — | 0.25em | Uppercase, `--gold` |
| Nav links | DM Sans | 13px | — | — | 0.1em | Uppercase |
| Caption / label | DM Sans | 9–11px | — | — | 0.1–0.15em | Uppercase |
| Logo | Cormorant Garamond | 28–32px | 300 | — | 0.12em | |
| Stat value | Cormorant Garamond | 56px | 300 | 1 | — | `sup` tags in `--gold` |
| Balance (phone) | Cormorant Garamond | 34px | 300 | — | — | |

### 3.3 Typography Rules

- **Italic `<em>` inside headings** is a design pattern, not semantic emphasis. It changes color to `--blush-deep` and signals the emotional/key word in a sentence.
- Body copy default weight is **300** (light). Use 400 only for interactive labels. Use 500 for amounts and numbers that need to stand out.
- All eyebrow labels follow the same pattern: `[32px gold line] + [text in uppercase + gold + wide letter-spacing]`

---

## 4. Spacing & Layout

### 4.1 Base Grid

- Max content width: implied ~1200px, achieved through `padding: 0 48px` on sections
- Mobile gutters: `24px` (breakpoint at `900px`)
- Section vertical padding: `120px` for major sections, `80–100px` for supporting sections
- Card grid gap: `2px` (intentionally tight — creates a mosaic / tile feeling)

### 4.2 Spacing Scale

Use multiples of 4px. Common values in use: `4, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 60, 64, 72, 80, 100, 120, 140`.

### 4.3 Border Radius

| Element | Radius |
|---|---|
| Buttons (primary) | `2px` — almost sharp, intentional |
| Feature cards | `0px` — full sharp edge |
| Phone mockup | `36px` outer / `28px` screen |
| Float cards | `12px` |
| Phone inner card | `16px` |
| Step number circle | `50%` |
| Theme toggle | `100px` (pill) |
| Avatar | `50%` |

The near-zero radius on buttons and cards is a deliberate choice — it reads as refined and architectural, not soft or app-like.

---

## 5. Theme System

### 5.1 How It Works

Theming is driven entirely by CSS custom properties on the root element. The `html` element gets a `data-theme="dark"` attribute to activate dark mode. All component styles reference token variables — no hardcoded colors anywhere.

```
html                  → light theme (default)
html[data-theme="dark"] → dark theme overrides
```

### 5.2 Three-Layer Theme Resolution

1. **Saved preference** — check persistent storage for `duet-theme` key first
2. **System preference** — if no saved preference, read `prefers-color-scheme`
3. **Default** — fall back to light

### 5.3 Theme Toggle Component

- A pill-shaped button `48px × 26px` in the nav
- Contains two icon layers: ☀ (sun) and ☽ (moon), stacked absolutely
- In light mode: sun is visible (`opacity: 1, translateY(0)`), moon is hidden (`opacity: 0, translateY(20px)`)
- In dark mode: moon slides in from below, sun slides out above
- Icon swap uses `transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease`
- Listen for OS changes with `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` and apply only if no saved preference exists

### 5.4 Theme Transition

Apply this to all elements so the switch feels cinematic, not jarring:
```
transition: background-color 0.4s ease, border-color 0.4s ease, color 0.4s ease
```
Note: exclude `transform` and `opacity` from this blanket transition — those are used for animations that should not be throttled.

---

## 6. Animation System

Animations are the soul of this design. Every motion should feel **organic, slow, and breathing** — never snappy or mechanical.

### 6.1 Core Keyframes

**`fadeUp`** — used for hero content entrance
```
from: opacity 0, translateY(30px)
to:   opacity 1, translateY(0)
duration: 0.8–0.9s, ease
```
Stagger delays: eyebrow 0.3s → h1 0.5s → description 0.7s → CTA 0.9s

**`fadeIn`** — used for the hero visual (phone + cards)
```
from: opacity 0, scale(0.95)
to:   opacity 1, scale(1)
duration: 1.2s, ease, delay: 1.1s
```

**`navIn`** — nav bar entrance
```
from: opacity 0, translateY(-20px)
to:   opacity 1, translateY(0)
duration: 1s, ease
```

**`floatOrb`** — ambient background orbs
```
0%:   translate(0, 0) scale(1)
33%:  translate(30px, -20px) scale(1.05)
66%:  translate(-20px, 15px) scale(0.97)
duration: 8s, ease-in-out, infinite
```
Three orbs each offset with animation-delay: 0s, -3s, -5s

**`phoneFloat`** — hero phone mockup hover
```
0%, 100%: rotate(3deg) translateY(0)
50%:      rotate(3deg) translateY(-12px)
duration: 4s, ease-in-out, infinite, delay: 1.5s
```

**`floatCard1`** — floating info card (left)
```
0%, 100%: translateY(0) rotate(-4deg)
50%:      translateY(-10px) rotate(-4deg)
duration: 5s, ease-in-out, infinite, delay: 2s
```

**`floatCard2`** — floating info card (right)
```
0%, 100%: translateY(0) rotate(5deg)
50%:      translateY(-8px) rotate(5deg)
duration: 5s, ease-in-out, infinite, delay: 3s
```

**`txPop`** — transaction row entrance in phone mockup
```
from: opacity 0, translateX(10px)
to:   opacity 1, translateX(0)
duration: 0.4s, ease, backwards
```
Staggered: row 2 at 1.8s, row 3 at 2.2s, row 4 at 2.6s

**`pulse`** — logo dot
```
0%, 100%: scale(1), opacity 1
50%:      scale(1.5), opacity 0.6
duration: 2s, ease-in-out, infinite
```

**`marquee`** — scrolling ticker
```
from: translateX(0)
to:   translateX(-50%)
duration: 20s, linear, infinite
```
Content is duplicated so the loop is seamless.

**`heartBeat`** — couple connect heart icon
```
0%, 100%: scale(1)
14%:  scale(1.3)
28%:  scale(1)
42%:  scale(1.2)
56%:  scale(1)
duration: 1.4s, ease-in-out, infinite
```

**`avatarBob`** — partner avatars in connect section
```
0%, 100%: translateY(0)
50%:      translateY(-6px)
duration: 3s, ease-in-out, infinite
```
Two avatars offset by `-1.5s` to bob out of phase.

**`codePulse`** — couple pairing code border
```
0%, 100%: border-color rgba(201,168,76,0.4)
50%:      border-color rgba(201,168,76,0.8)
duration: 2s, ease-in-out, infinite
```

### 6.2 Scroll Reveal

All sections and cards use a scroll-triggered reveal pattern:
- Default state: `opacity: 0; transform: translateY(40px)`
- Triggered state (class `.visible`): `opacity: 1; transform: translateY(0)`
- Transition: `0.6–0.7s ease`
- Use `IntersectionObserver` with `threshold: 0.15`
- For grouped items (steps, feature cards): add `transition-delay` in increments of `0.1–0.15s` per item

### 6.3 Parallax

On mouse move, the three hero orbs shift at different rates to create depth:
- Orb 1 (gold, top-right): moves at `0.5x` mouse offset
- Orb 2 (blush, bottom-left): moves at `-0.3x` (counter-direction)
- Orb 3 (sage, center): moves at `0.7x`

Calculate offset as: `(mouseX / windowWidth - 0.5) * 30` for X, `* 20` for Y.

### 6.4 Custom Cursor

A `20×20px` circle with `1px solid --gold` border follows the mouse with `0.12` lerp (lag factor), creating a trailing effect. On hover of interactive elements, it expands to `40×40px` and fills with `rgba(--gold, 0.15)`.

---

## 7. Reusable Components

### 7.1 Eyebrow Label

A small section pre-title. Always gold, always uppercase, always paired with a 32px gold horizontal line.

```
[──] SECTION TITLE
```

- Font: DM Sans, 11px, letter-spacing 0.25em, uppercase
- Color: `--gold`
- Line: `32px × 1px`, background `--gold`
- Gap between line and text: `10px`
- Used above every `h2` section heading

---

### 7.2 Button — Primary

A full-bleed ink rectangle with a gold wipe-in on hover.

- Background: `--ink`
- Color: `--cream`
- Padding: `16px 36px`
- Border radius: `2px`
- Font: 13px, uppercase, letter-spacing 0.12em
- Hover: lifts `translateY(-2px)`, gold overlay wipes in from left using `::before` pseudo-element with `translateX(-100%) → translateX(0)` at `0.4s cubic-bezier(0.4, 0, 0.2, 1)`
- The label text must be wrapped in `<span>` so it sits above the pseudo-element overlay

---

### 7.3 Button — Secondary

A text link with an animated arrow.

- No background, no border
- Color: `--ink-soft`, transitions to `--ink` on hover
- Contains an arrow character (→ or ↗) after the label
- On hover: gap between text and arrow expands from `8px` to `14px`
- Font: 13px, letter-spacing 0.08em

---

### 7.4 Nav Link

- Font: DM Sans, 13px, uppercase, letter-spacing 0.1em
- Color: `--ink-soft` → `--ink` on hover
- Underline: `::after` pseudo-element, `1px solid --gold`, `width: 0 → 100%` on hover at `0.3s ease`
- The "Get Started" link uses the primary button style but smaller: `10px 24px` padding, `12px` font

---

### 7.5 Feature Card

A content card with a dramatic full-cover ink fill on hover.

Structure (top to bottom):
1. Index number (e.g., "01") — Cormorant Garamond, 13px, gold, letter-spacing 0.1em
2. Icon — emoji, 28px
3. Gold/blush divider line — `32px × 1px`
4. `h3` title — Cormorant Garamond, 26px
5. Body paragraph — DM Sans, 14px, line-height 1.7

Default: `--warm-white` background, `48px 40px` padding
Hover behavior:
- Card lifts: `translateY(-4px)`
- `::before` pseudo-element (background `--ink`) scales from `scaleY(0)` to `scaleY(1)` from the bottom, `0.5s cubic-bezier(0.4, 0, 0.2, 1)`
- All text transitions to `--cream`
- Divider line transitions to `--gold`
- Icon color transitions to `--gold`

Grid: 3 columns with `2px` gap. This near-zero gap creates a tile mosaic look — do not increase it.

---

### 7.6 Section Header (Two-Column)

A section intro that splits into left headline + right supporting note.

- Left: eyebrow label + `h2` heading
- Right: short paragraph (`max-width: 300px`, 14px, `--ink-soft`)
- Layout: `flex`, `justify-content: space-between`, `align-items: flex-end`
- Margin bottom: `72px`

---

### 7.7 Step Indicator

Used in the "How it works" section on a dark background.

- A circle `56×56px`, `1px solid rgba(--gold, 0.3)`, background `rgba(--gold, 0.05)`
- Number inside: Cormorant Garamond, 20px, gold
- Outer ring: `::after` pseudo-element, 4px larger, `1px solid rgba(--gold, 0.1)`
- `h4` below: Cormorant Garamond, 22px, `--cream`
- Paragraph: DM Sans, 14px, `rgba(--cream, 0.55)`
- Four steps in a row with a connecting gradient gold line running between them at `top: 28px`

---

### 7.8 Stat Tile

Simple centered tile.

- Background: `--stat-bg`
- Padding: `48px 40px`, text centered
- Value: Cormorant Garamond, 56px, weight 300, `--ink`
- `sup` within value: 24px, `--gold`, appears for currency and unit symbols
- Label: DM Sans, 12px, uppercase, letter-spacing 0.15em, `--ink-soft`
- Grid: 4 columns, `2px` gap

---

### 7.9 Marquee Ticker

A dark `--ink` band between hero and features.

- Full-width, `padding: 16px 0`, `overflow: hidden`
- Items: DM Sans, 12px, uppercase, letter-spacing 0.2em, `rgba(--cream, 0.5)`
- Each item separated by a `4×4px` gold dot
- Content duplicated once for seamless loop
- Animation: `translateX(0) → translateX(-50%)`, `20s linear infinite`

---

### 7.10 Floating Info Card

Used floating beside the phone mockup in the hero.

- Background: `rgba(--warm-white, 0.92)`, `backdrop-filter: blur(16px)`
- Border: `1px solid rgba(--gold, 0.2)`
- Border radius: `12px`
- Padding: `12px 16px`
- Shadow: `0 8px 32px rgba(--ink, 0.12)`
- Label: DM Sans, 9px, uppercase, letter-spacing 0.15em, `--ink-soft`
- Value: Cormorant Garamond, 20px, `--ink`
- Badge row: flex, `5×5px` colored dot + 10px DM Sans text

---

### 7.11 Couple Code Visual

The visual metaphor for partner connection.

Three horizontal elements:
1. **Avatar** — `72×72px` circle, `--ink` background, cream initial letter (Cormorant Garamond, 24px), bobs on `avatarBob`
2. **Code bridge** — centered column containing:
   - Code text (Cormorant Garamond, 22px, letter-spacing 0.3em, `--gold`) in a dashed gold border rounded box
   - "Couple code" label (DM Sans, 10px, uppercase, `--ink-soft`)
   - Heart character (16px, `--blush-deep`) with `heartBeat` animation
3. **Avatar** — `72×72px` circle, `--blush` background, ink initial letter, bobs with `-1.5s` offset

---

### 7.12 Phone Mockup

A realistic phone frame used in the hero.

Outer shell: `280×560px`, background `--ink`, `border-radius: 36px`, `padding: 12px`
Shadows: multi-layer — `0 40px 80px rgba(--ink, 0.3)` + `0 8px 16px rgba(--ink, 0.15)` + `inset 0 1px 0 rgba(white, 0.1)`
Rotation: `3deg`, floats vertically on `phoneFloat`

Screen: `--warm-white` background, `border-radius: 28px`
Notch: `100×28px` pill, `--ink` background, `border-radius: 0 0 18px 18px`, centered

Phone content structure:
- Greeting line: DM Sans, 11px, `--ink-soft`
- Balance: Cormorant Garamond, 34px, currency symbol in smaller inline `<span>`
- Summary card: dark `--ink` rounded card, label + value + sub-label
- Transaction list: each row is flex space-between, name/date pair on left, amount on right

---

### 7.13 Theme Toggle Button

See Section 5.3 for full specification.

---

### 7.14 Noise Overlay

A full-viewport fixed `::before` pseudo-element on `<body>` using an inline SVG `feTurbulence` filter to apply a subtle film grain. `opacity: 0.4`, `pointer-events: none`, `z-index: 999`. This gives all surfaces an organic, non-digital texture.

---

## 8. Background Effects

### 8.1 Hero Orbs

Three absolutely positioned circles behind the hero content. They have no hard edges — `border-radius: 50%` and `filter: blur(80px)`. Colors are radial gradients from accent colors to transparent.

- Orb 1: `500×500px`, gold, top-right, `opacity` effect at `0.2`
- Orb 2: `400×400px`, blush, bottom-left, `opacity` at `0.25`
- Orb 3: `300×300px`, sage, center-right, `opacity` at `0.15`

All three continuously drift on `floatOrb` with different delays, and respond to mouse parallax (see 6.3).

### 8.2 Decorative SVG Lines

Behind the hero, an absolute SVG at full dimensions draws:
- Two diagonal lines across the viewport in `rgba(--gold, 0.04–0.05)`
- Two concentric circles on the right side in `rgba(--gold, 0.02–0.04)`

These are not visible on their own — they add subliminal structure and depth.

### 8.3 Dark Section Glow

The "How it works" dark section and the CTA section use a `radial-gradient` background overlay:
```
radial-gradient(ellipse 80% 60% at 70% 50%, rgba(--gold, 0.08), transparent 70%)
```
This creates a soft gold ambient light in the dark area, reinforcing warmth.

---

## 9. Landing Page — Section-by-Section Blueprint

### 9.1 Navigation Bar

**Layout:** Fixed, full-width, flex row — logo left, nav links right.
**Background:** Frosted glass (`backdrop-filter: blur(12px)`) using `--nav-bg`. Becomes more opaque (`--nav-bg-scroll`) after 50px scroll.
**Border:** `1px solid rgba(--gold, 0.15)` on the bottom.
**Entrance animation:** Slides in from `-20px` over `1s`.

Contents:
- Logo: word mark with animated gold pulse dot beside it
- Links: Features, How it works, Couples (all with gold underline on hover)
- Theme toggle (☀/☽ pill)
- "Get Started" primary CTA button

---

### 9.2 Hero Section

**Layout:** Two-column CSS grid (`1fr 1fr`), full viewport height, vertically centered.
**Left column — content:**
- Eyebrow label: "Couple Finance Tracker"
- `h1` headline: main claim with italic `em` accent on the emotional word
- Body paragraph: 2–3 sentence product summary, max 440px wide
- Two CTAs: primary button + secondary text link

**Right column — visual:**
- Phone mockup showing a live-feeling app screen with greeting, balance, summary card, and transaction list
- Two floating info cards (savings goal + partner spend), each slightly rotated, gently floating
- All three elements animate independently on load

**Background layer (absolute, behind content):**
- Three blurred color orbs
- Faint SVG diagonal lines and circles

---

### 9.3 Marquee Ticker

**Full-width dark band (`--ink` background)** between hero and features.
A single horizontal scrolling row of feature keywords separated by gold dots. Animates left infinitely. Content is the design's "heartbeat" — keeps the page feeling alive.

---

### 9.4 Features Section

**Layout:** Standard section with two-column section header, then a 3×2 card grid.

**Section header:**
- Left: eyebrow + `h2` "Everything a couple needs to thrive"
- Right: short supporting paragraph

**Feature grid:** 6 cards in a 3-column layout with `2px` gap. Each card has hover fill animation. Cards stagger their scroll-reveal by `0.1s` increments.

The six features: Instant Entry, Partner Sync, Live Balance, Shared Goals, Telegram Bot, Private & Safe.

---

### 9.5 How It Works Section

**Full-width dark section** (`--ink` background with gold ambient glow).
- Centered eyebrow + `h2`
- Four steps in a horizontal row connected by a faint gold gradient line
- Steps stagger their scroll-reveal by `0.15s` increments

---

### 9.6 Stats Bar

**Four tiles in a row**, `2px` gap. Each shows a giant serif number with a small sans label below. The numbers use superscript symbols ($ for free, s for seconds, ♾ for infinite, ∞ for unlimited). Light `--stat-bg` surface.

---

### 9.7 Couple Connect Card

A single wide card in a section with `64px` padding and a `3px` gold-to-blush gradient left border.
- Left side: eyebrow, `h2`, and explanatory paragraph
- Right side: the Couple Code Visual component (two avatars + code bridge with pulsing code + heartbeat)

---

### 9.8 Testimonial Section

**Full-width section** with `--testimonial-bg` (blush/warm surface).
- Giant decorative `"` mark as background (Cormorant Garamond, 320px, very low opacity)
- Centered `<blockquote>` in large italic serif: a short, specific, human quote
- `<cite>` attribution below in small uppercase DM Sans

---

### 9.9 CTA Section

**Full-width section**, light background with gold radial glow.
- Centered eyebrow + very large `h2` (up to 96px) with italic accent
- Short subheading
- Two CTA buttons centered (primary + secondary)

---

### 9.10 Footer

**Dark (`--ink`) four-column grid:**
- Column 1 (wide): logo + tagline
- Columns 2–4: link lists with gold `h5` headers (Product, Company, Legal)

**Footer bottom bar:** Same dark background, separated by a `0.08` opacity ink border. Left: copyright. Right: brand tagline with heart symbol.

---

## 10. Responsive Behavior

At `≤ 900px`:
- Nav hides link list (keep logo and CTA)
- Hero becomes single column; phone visual hides
- Features grid becomes single column
- Steps grid becomes 2-column; connecting line hides
- Stats grid becomes 2-column
- Footer becomes 2-column
- Section padding reduces to `80px 24px`
- Section headers stack vertically

---

## 11. Implementation Checklist

When building a new screen or component, verify:

- [ ] All colors reference design tokens — no hardcoded hex values
- [ ] Component works in both light and dark mode
- [ ] Theme switch triggers a `0.4s ease` transition on bg, border, and color
- [ ] Headings use Cormorant Garamond; body uses DM Sans
- [ ] Italic `<em>` in headings is colored `--blush-deep`
- [ ] Eyebrow labels follow the `[line] + [uppercase text]` pattern in `--gold`
- [ ] Buttons use the correct radius (2px primary, text-only secondary)
- [ ] Cards use `2px` gap in grids (not `16px` or `24px`)
- [ ] Interactive elements (links, buttons, cards) have deliberate hover states
- [ ] Scroll-reveal applied to all sections below the fold
- [ ] New scroll-reveal items stagger their delay if there are multiple in a row
- [ ] Animations use `ease-in-out` for looping motions, `cubic-bezier(0.4, 0, 0.2, 1)` for UI transitions
- [ ] No animation snaps — minimum duration is `0.3s`, ambient animations are `4s+`
- [ ] Noise overlay is present on every full page
- [ ] Mobile breakpoint collapses to single-column appropriately

---

*This document covers the complete visual language of Duet. When in doubt: warmer, slower, more intentional.*
