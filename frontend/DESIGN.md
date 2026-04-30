# Design System: AWS Cost Optimizer Dashboard

## 1. Visual Theme & Atmosphere

A precision instrument for financial decision-making. The atmosphere is deep-space dark — like mission control at 2AM: everything serves the operator, nothing decorates. High information density with surgical clarity. Data surfaces breathe through controlled negative space rather than generous padding. Trust is communicated through monospaced numbers, muted severity indicators, and restrained accent usage. Motion is purposeful — skeleton loaders that mirror layout geometry, staggered table reveals, and a single persistent pulse on the "live scan" indicator.

Density **7** · Variance **5** · Motion **5**

---

## 2. Color Palette & Roles

- **Abyss** (`#09090B`) — Root canvas background, deepest layer. Zinc-950.
- **Void Surface** (`#111113`) — Card and panel fill. Slightly lifted from canvas.
- **Graphite Edge** (`#27272A`) — Border, divider lines, 1px structural elements. Zinc-800.
- **Steel Mist** (`#3F3F46`) — Inactive states, disabled controls, table row separators. Zinc-700.
- **Ash Text** (`#A1A1AA`) — Secondary text, metadata, column headers, timestamps. Zinc-400.
- **Fog Text** (`#D4D4D8`) — Primary body text, table cell values. Zinc-300.
- **Snow Label** (`#FAFAFA`) — Page titles, section headings, critical values. Zinc-50.
- **Ember** (`#E8793A`) — Single accent. CTAs, active row highlight left-border, focus rings, chart primary bar. Saturation 68%. No glow.
- **Severity High** (`#EF4444`) — High-severity badge fill (muted, `opacity-90`). Red-500.
- **Severity Medium** (`#F59E0B`) — Medium-severity badge. Amber-500.
- **Severity Low** (`#22C55E`) — Low-severity badge. Green-500.
- **Savings Green** (`#4ADE80`) — Positive savings delta values. Green-400.
- **Surface Overlay** (`rgba(255,255,255,0.03)`) — Hover state for table rows, subtle lift.

> No purple. No neon gradients. No pure black `#000000`. No white `#FFFFFF` as canvas.

---

## 3. Typography Rules

- **Display / Page Titles:** `Geist` — Weight 600–700, letter-spacing `-0.03em`, `Snow Label` color. Used for page header ("Cost Findings"), modal titles, empty state headers.
- **Section Headers / Column Labels:** `Geist` — Weight 500, uppercase, letter-spacing `0.08em`, font-size `0.7rem`, `Ash Text` color. The tracking creates visual separation without size escalation.
- **Body / Table Cells:** `Geist` — Weight 400, line-height `1.5`, `Fog Text`. Max 72ch per cell before truncation with tooltip.
- **Monospace / Numbers:** `Geist Mono` — ALL numeric values, currency amounts, savings figures, percentages, timestamps, resource IDs, AWS ARNs. Non-negotiable. This is what makes financial data trustworthy.
- **Code / Resource IDs:** `Geist Mono` — `Ash Text`, font-size `0.8rem`, `Graphite Edge` background pill.

**Banned:** `Inter`, `Roboto`, any system-default sans. Serif fonts banned everywhere in this UI.

**Scale (px reference):**
- `xs`: 11px — metadata, badges
- `sm`: 13px — table cells, helper text
- `base`: 15px — body default
- `lg`: 18px — card summaries
- `xl`: 24px — section titles
- `2xl`: 32px — page header
- `3xl`: 48px — hero savings total

---

## 4. Component Stylings

### Summary Cards (Top KPI Strip)
Three cards across the top: **Total Active Findings**, **Monthly Savings**, **High Severity Count**. Asymmetric sizing — Savings card is wider (spanning 2 units) since it's the primary metric. No equal-width trio.
- Background: `Void Surface`, border `1px solid Graphite Edge`
- Corner radius: `0.75rem` (12px) — not aggressively rounded, instrument-like
- Monthly Savings value: `Geist Mono` 48px `Savings Green`, preceded by `$` in `Ash Text` 28px
- Perpetual micro-motion on savings value: subtle `shimmer` pulse every 4s to indicate live data

### Findings Table
The primary component. Full-width, sticky column headers.
- Row height: `48px` — dense but not cramped
- Alternating rows: even rows `Abyss`, odd rows `rgba(255,255,255,0.015)`
- Hover state: `Surface Overlay` + `2px left border Ember` inset
- Active/selected row: `Ember` left-border `3px` + row background `rgba(232,121,58,0.07)`
- Column widths: fixed via CSS Grid, not table auto-layout. Resource ID column has truncation.
- Sort indicators: `Ash Text` chevron, `Snow Label` when active column
- Staggered mount: rows cascade in with `opacity: 0 → 1` + `translateY(4px → 0)`, 30ms stagger, total < 400ms

### Severity Badge
Inline pill component: `border-radius: 999px`, `padding: 2px 8px`, font-size `11px`, `Geist` weight 600 uppercase.
- High: `Severity High` bg at `opacity-15`, text `Severity High` at `opacity-100`, border `1px solid Severity High opacity-30`
- Medium: same pattern with `Severity Medium`
- Low: same pattern with `Severity Low`
- No solid fills — tinted glass effect preserves dark background visibility

### Check Type Tag
Monochrome pill for check type labels (`ec2-idle`, `ebs-orphan`, etc.):
- Background: `Graphite Edge`, text: `Ash Text`, `Geist Mono` 11px
- No color per check type — color is reserved for severity only

### Savings Bar Chart (Breakdown by Check Type)
Horizontal bar chart using Recharts. Bars are single-color `Ember`.
- Background grid lines: `Graphite Edge`, 1px dashed
- Axis labels: `Geist Mono` `Ash Text` 11px
- Bar `border-radius`: `0 4px 4px 0` (right-side only — directional)
- Tooltip: `Void Surface` bg, `1px Graphite Edge` border, `Geist Mono` values
- No animation on mount — bars render immediately to avoid distraction from table

### Dismiss Button
Inline table action, text-only style:
- Default: `Ash Text`, weight 400
- Hover: `Fog Text` + `text-underline`
- Active: `-1px translateY`, `0.95 scale`
- No background, no border — contextual action, not primary CTA

### Primary CTA (e.g., "Run Scan Now")
- Fill: `Ember`, text: `#09090B` (Abyss — dark text on warm accent)
- `border-radius: 0.5rem`, `padding: 10px 20px`
- Active state: `-1px translateY`, no outer glow
- No secondary CTA alongside primary

### Skeleton Loaders
Match exact table row dimensions — 48px tall rows with column-accurate shimmer bars.
- Shimmer: `background: linear-gradient(90deg, Graphite Edge 25%, Steel Mist 50%, Graphite Edge 75%)`, `background-size: 200% 100%`, `animation: shimmer 1.5s infinite`
- Show 8 skeleton rows on initial load

### Empty State
For zero findings:
- Centered composition: icon (SVG scanner outline, not emoji), 3-line message, single action button
- Icon: `Steel Mist`, 64px
- Title: "No findings detected" — `Snow Label` `xl`
- Subtitle: "Run a scan to analyze your AWS infrastructure" — `Ash Text` `sm`
- CTA: Primary button style

### Filter Bar
Above table: check type filter (multi-select chips), severity filter (radio pills), min savings slider.
- Filter chips: `Graphite Edge` bg default, `Ember` border + `rgba(232,121,58,0.1)` bg when active
- Slider track: `Graphite Edge`, thumb `Ember`, fill `Ember opacity-60`

---

## 5. Layout Principles

**Grid architecture:** CSS Grid for the full dashboard layout. Sidebar (if any) via `grid-template-columns: 240px 1fr`. Main content max-width `1440px` centered.

**Page structure (no sidebar — full-width data tool):**
```
[Header: logo + nav + scan button]
[KPI Strip: 3 summary cards — asymmetric 1:2:1 ratio]
[Filter Bar]
[Table: full width]
[Chart: 50% width left | Severity breakdown: 50% right]
```

**Spacing system:** Base unit `4px`. Common values: `8, 12, 16, 24, 32, 48, 64px`. Section gaps `clamp(1.5rem, 4vw, 3rem)`.

**No:** Flexbox percentage math, `calc()` hacks, overlapping elements, equal-width 3-column grids.

**Responsive collapse (< 768px):**
- KPI strip: single column stack
- Table: horizontal scroll container with sticky first column (Resource ID)
- Chart + breakdown: full-width stack, chart first
- Filter bar: collapses to bottom sheet drawer

**Sticky header:** Navigation bar stays fixed top. `backdrop-blur(12px)` + `Abyss opacity-80` for frosted glass effect. 1px border-bottom `Graphite Edge`.

---

## 6. Motion & Interaction

**Spring physics:** `stiffness: 120, damping: 22` — weighty, intentional. No linear easing anywhere.

**Table cascade reveal:** On data load, rows stagger in: `opacity 0→1` + `translateY 6px→0`, 25ms between rows, easing `cubic-bezier(0.16, 1, 0.3, 1)`.

**Savings shimmer pulse:** On the monthly savings KPI card, a subtle `box-shadow: 0 0 0 1px rgba(74,222,128,0.2)` pulses every 4s with `animation: pulse 4s ease-in-out infinite`. Low intensity — indicates live/fresh data.

**Scan running state:** When a scan is in progress, a thin `Ember` progress bar animates across the top of the page (indeterminate). Not a spinner.

**Row dismiss transition:** On dismiss action, row slides right `translateX(100%)` + `opacity 0` over 250ms, then collapses height from `48px → 0` over 150ms. Sequential, not parallel.

**Hardware-accelerated only:** `transform` and `opacity`. Never animate `height`, `width`, `top`, `left`, `background-color`.

---

## 7. Anti-Patterns (Banned)

- No emojis anywhere — not in empty states, tooltips, or labels
- No `Inter` font under any circumstance
- No pure black `#000000` or pure white `#FFFFFF` as canvas
- No neon outer glows on buttons, badges, or cards
- No purple or blue neon gradients
- No oversaturated accents (Ember sits at 68% saturation — do not increase)
- No equal-width 3-column card layouts — use asymmetric ratios
- No circular loading spinners — skeleton loaders only
- No gradient text on headers
- No custom mouse cursors
- No overlapping elements — every element occupies its own clear spatial zone
- No AI copywriting: "Seamless", "Unleash", "Next-Gen", "Elevate", "Effortlessly"
- No fake round numbers in copy ("Save 99.99%")
- No "Scroll to explore", bounce arrows, or scroll chevrons
- No broken or placeholder image URLs — use deterministic SVG avatars or omit
- No centered hero sections (variance = 5 — use left-aligned or asymmetric layouts)
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No horizontal scroll on mobile (except intentional table scroll with sticky column)
- No serif fonts anywhere in this UI
