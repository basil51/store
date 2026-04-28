# Frontend Roadmap — NEXMART-style Dark Theme

Reference design: `modern-store.html`  
Stack: Next.js 15 (App Router) · Tailwind CSS · Medusa JS SDK

---

## Design language

| Token | Dark mode | Light mode |
|---|---|---|
| `--bg` | `#0c0e14` | `#f4f6fb` |
| `--surface` | `#13161f` | `#ffffff` |
| `--surface2` | `#1a1e2b` | `#f0f2f8` |
| `--border` | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.08)` |
| `--teal` | `#00e5c8` | `#00b89e` |
| `--coral` | `#ff5e62` | `#e04f52` |
| `--amber` | `#ffcb47` | `#e6a800` |
| `--text` | `#f0f2f8` | `#0c0e14` |
| `--text-muted` | `#8892a4` | `#4e566a` |
| Headings font | **Syne** (700/800) | same |
| Body font | **DM Sans** (300–600) | same |

Theme is toggled via a `data-theme` attribute on `<html>`. Dark is default.

---

## Phase 1 — Design system & fonts ✅

- [x] Add **Syne** + **DM Sans** via `next/font/google`
- [x] Rewrite `globals.css` with the full dark/light CSS variable set (on `[data-theme=dark]` / `[data-theme=light]`)
- [x] Add all component utility classes: `.card`, `.btn-primary`, `.btn-secondary`, `.badge`, `.glow-teal`, `.glow-coral`
- [x] `ThemeProvider` client component — reads `localStorage`, sets `data-theme`, exports `useTheme()`
- [x] Theme toggle icon button component

**Deliverable:** Every page uses the dark palette by default; one click switches to light.

---

## Phase 2 — Announcement ticker ✅

- [x] `Ticker` component — horizontal scroll of promotional messages
- [x] Animated gradient background (`coral → teal → coral`)
- [x] Messages come from a static config first; later replaced by Medusa custom fields / announcements table

---

## Phase 3 — Header ✅

- [x] Sticky `Header` with blur/glass background (`bg-[var(--bg)]/85 backdrop-blur-xl`)
- [x] **Logo** — Syne font, teal accent, coral pulse dot
- [x] **Search bar** — rounded pill, teal focus glow, magnifier button
- [x] **Actions** — Sign In · Wishlist · Cart pill (coral gradient) with animated item count badge
- [x] On mobile: collapse Sign In + Wishlist, keep hamburger + Cart

---

## Phase 4 — Category nav bar (from DB) ✅

- [x] Horizontal scrollable nav bar below header
- [x] Items fetched from Medusa **product categories** (top-level)
- [x] Active item gets teal underline indicator
- [x] "Flash Deals" item with HOT badge
- [x] Clicking a nav item filters `/store` or navigates to `/categories/[handle]`

---

## Phase 5 — Sidebar (from DB) ✅

- [x] Fixed-width left sidebar (hidden on tablet/mobile)
- [x] **Categories** section — from Medusa `listCategories()`
- [x] **Collections / Brands** section — from Medusa `listCollections()`
- [x] **Price range** — static filter links that set URL search params
- [x] Each section has a teal left-border accent title bar
- [x] Hover: teal color + left-padding slide animation

---

## Phase 6 — Hero section ✅

- [x] Full-width banner inside main content area
- [x] Dark gradient background + subtle grid overlay
- [x] Three animated floating orbs (teal, coral, amber)
- [x] Chip badge (live deal count or campaign name from Medusa)
- [x] Syne headline with teal + coral word highlights
- [x] Primary CTA button (teal) + secondary (outline)
- [x] Stat row (live product/collection/category count from DB)
- [x] Right-side collection cards

---

## Phase 7 — Flash sale countdown strip ✅

- [x] Coral left border accent panel
- [x] Flash Sale badge (coral gradient)
- [x] Live JS countdown timer (HH:MM:SS blocks, teal glow)
- [x] Counts down to midnight UTC, resets daily

---

## Phase 8 — Category icon pills ✅

- [x] 8-column icon grid (responsive: 4 on tablet, 2 on mobile)
- [x] Top-level categories from Medusa (emoji from metadata or EMOJI_MAP fallback)
- [x] Hover: scale emoji, lift with teal border
- [x] Clicking navigates to the category page

---

## Phase 9 — Product card & grid ✅

- [x] Square image aspect ratio (`size="square"`)
- [x] Badge overlay: reads `product.metadata.badge` (DEAL/HOT/NEW/TOP), falls back to sale detection
- [x] Discount % coral pill (bottom-left) when price is on sale
- [x] Wishlist heart button (client component, appears on hover, toggles coral fill)
- [x] 2-line clamp product title
- [x] Price: teal for regular, coral for sale + strikethrough original (CSS vars, no hardcoding)
- [x] "View Product →" teal outline bar slides up on hover
- [x] `PreviewPrice` colors replaced with CSS variables

---

## Phase 10 — Promo banners ✅

- [x] 2-column banner row (stacks on mobile)
- [x] Each banner: dark gradient bg, two blurred orbs, tag/kicker, Syne headline, subtitle, CTA button, floating emoji
- [x] Teal theme (first collection) + coral theme (second collection)
- [x] Emoji/tag/subtitle customizable via `collection.metadata.banner_emoji/banner_tag/banner_subtitle`
- [x] Hover: lift + emoji scales+rotates

---

## Phase 11 — Brand strip ✅

- [x] Horizontal surface card with "Featured Brands" label + vertical divider
- [x] Collections filtered by `metadata.type === "brand"` or `metadata.is_brand === true`; falls back to all collections
- [x] Shows logo image from `metadata.brand_logo` URL if set, otherwise typographic name
- [x] Hover: full opacity (from 50%) — teal color on name via CSS var
- [x] Responsive: stacks label + list on mobile, inline row on small+

---

## Phase 12 — Product detail page ✅

- [x] Image gallery: dark `var(--surface2)` bg, teal radial glow, `rounded-2xl`, CSS var border
- [x] Sidebar panels: `var(--surface)` bg + `var(--border)` — all three (info, actions, tabs)
- [x] Product title: `font-syne font-bold`, `var(--text)` — no hardcoded colors
- [x] Collection pill: teal bg/border/text via CSS vars
- [x] Option highlight chips: `var(--surface2)` + `var(--text-dim)` + `var(--border)`
- [x] Description: `var(--text-dim)`
- [x] Price block: teal for regular, coral for sale, strikethrough original, coral discount % badge
- [x] Add to Cart button: teal with `var(--glow-teal)` — dims to surface when unavailable

---

## Phase 13 — Store / browse page ✅

- [x] Inline sort bar (Newest · Price ↑ · Price ↓ pill switcher) above product grid with live count
- [x] Sort bar wired via `useSearchParams` — updates URL, clears pagination
- [x] Pagination restyled: teal active page, `var(--surface2)` inactive, prev/next ›/‹ arrows, rounded container
- [x] Category breadcrumb already in place with CSS vars (Phase 5 baseline)

---

## Phase 14 — Cart ✅

- [x] Cart page: two-column layout (items + summary) both in `var(--surface)` panels with `var(--border)`
- [x] "Go to checkout" button replaced with `btn-primary` teal CTA
- [x] Totals: row labels `var(--text-dim)`, total value in teal, discount in coral, border separators use `var(--border)`
- [x] Empty cart: centered panel with cart emoji, `font-syne` heading, `btn-primary` link to store
- [x] Sign-in prompt: teal tinted bg, `btn-ghost` sign in button
- [x] Cart heading + table header labels use CSS vars
- [x] Product title in item row uses `var(--text)`

---

## Phase 15 — User account pages ✅

- [x] `account-layout.tsx` — `var(--surface)` + `var(--border)` grid layout, removed hardcoded bg-white/gray
- [x] `account-nav` — dark surface sidebar, teal active indicator (left border + bg tint), CSS var colors throughout; mobile accordion with coral logout
- [x] Overview page — `var(--surface)` header panel, teal stat numbers (profile %, address count), recent orders in `var(--surface2)` rows with teal order IDs
- [x] `order-card` — CSS vars throughout, `btn-ghost` "See details →" replacing `Button variant="secondary"`
- [x] `login-template` — centered `min-h-[60vh]` with `var(--surface)` + `var(--border)` panel wrapper

---

## Phase 16 — Auth pages ✅

- [x] `login/index.tsx` — `font-syne` heading, `var(--text-dim)` subtitle, teal "Join us" toggle link
- [x] `register/index.tsx` — `font-syne` heading, 2-col first/last name grid, teal Privacy/Terms links, teal "Sign in" toggle link
- [x] `input/index.tsx` — `var(--surface2)` bg, `var(--border)` outline, teal focus ring glow, coral required `*`, removed `@medusajs/ui` Label
- [x] `submit-button/index.tsx` — `btn-primary` native button, SVG spinner when pending, removed `@medusajs/ui` Button
- [x] `error-message/index.tsx` — `var(--coral)` color, ⚠ icon prefix, removed `text-rose-500`

---

## Phase 17 — Checkout flow ✅

- [x] `checkout/page.tsx` — `gap-8` responsive grid, removed `gap-x-40`
- [x] `checkout-summary` — `var(--surface)` panel, `font-syne` "Order Summary" heading, `var(--border)` dividers, removed `@medusajs/ui` Heading/Divider
- [x] `addresses` — `var(--surface)` rounded-2xl panel, `font-syne` step heading, teal CheckCircle, teal Edit button, clean summary grid; removed Heading/Text/Divider from `@medusajs/ui`
- [x] `shipping` — same panel treatment; radio options use `rgba(0,229,200,0.08)` selected bg + teal border; `btn-primary` continue button; removed Button/Heading/Text/clx/Divider
- [x] `payment` — same panel; teal CheckCircle, `btn-primary` continue; replaced Container + Text/Heading/Button/clx/Divider
- [x] `payment-container` — CSS var radio options, dark Stripe card colour scheme (DM Sans, `#e8eaf2`); removed Text/clx
- [x] `review` — `var(--surface)` panel, opacity-dimmed when inactive; `btn-primary` Place Order; removed Heading/Text/clx
- [x] `payment-button` — native `<button className="btn-primary">`, "Processing..." text on pending; removed `Button` from `@medusajs/ui`
- [x] `discount-code` — teal toggle link, native `<input>` with CSS vars, teal/amber promo badges, coral remove button; removed Badge/Heading/Input/Label/Text from `@medusajs/ui`
- [x] `native-select` — `var(--surface2)` bg, `var(--border)` outline, `var(--text-dim)` chevron; removed `clx` from `@medusajs/ui`

---

## Phase 18 — Admin (Medusa Admin panel) ✅

Medusa ships its own `/app` admin panel. We wire it up properly:
- [x] Confirm admin runs on correct port (`pnpm dev:medusa` → port 9244, admin at `/app`)
- [x] Custom navigation categories, collections, products all editable from admin (built-in)
- [x] Product metadata fields for: emoji icon, badge type (deal/hot/new/top), hero chip text — `src/admin/widgets/product-metadata-widget.tsx` (zone `product.details.after`)
- [x] Ticker messages configurable via store metadata — `src/admin/routes/ticker/page.tsx` custom admin page; backend reads via `GET /store/ticker`; storefront ticker now async server component fetching from API (60s cache)

Current status: **Phase 19** (toast & micro-interactions) is next.

---

## Phase 19 — Toast & micro-interactions ✅

- [x] Global `Toast` component — `ToastProvider` + portal at `src/lib/context/toast-context.tsx`; bottom-right fixed portal, auto-dismiss after 3.5 s, dismiss button
- [x] Add-to-cart: teal toast — wired in `product-actions/index.tsx` `handleAddToCart`; also shows amber toast on error
- [x] Save/wishlist: coral toast — wired in `wishlist-button.tsx` (liked / unliked)
- [x] Error states: amber toast — caught in addToCart try/catch
- [x] `ToastProvider` wraps app in `src/app/layout.tsx` (inside `ThemeProvider`)
- [x] `@keyframes toastIn` (slide-up + spring) added to `globals.css`
- [x] Category pill cards lifted: `hover:-translate-y-1` added
- [x] All product cards, promo banners, hero items, category nav items — already had lift transitions from prior phases

Current status: **Phase 20** (SEO & performance) is next.

---

## Phase 20 — SEO & performance ✅

- [x] `next/font` with `display: swap` — already set on Syne + DM Sans in `app/layout.tsx` from Phase 1
- [x] `next/image` for all product images — `Thumbnail` component uses `<Image fill quality={60} sizes="...">` throughout
- [x] Opengraph metadata per product / category page:
  - **Home** (`page.tsx`) — `og:type website`, NEXMART site name, site description
  - **Store** (`store/page.tsx`) — full OG + Twitter card
  - **Product detail** (`products/[handle]/page.tsx`) — NEXMART branding, `product.description` trimmed to 160 chars, `og:image` from `product.thumbnail`, Twitter large-image card
  - **Category** (`categories/[...category]/page.tsx`) — NEXMART title, category description, OG + Twitter
  - **Collection** (`collections/[handle]/page.tsx`) — NEXMART title + description, OG + Twitter
- [x] Sitemap (`next-sitemap.js`) — `siteUrl` now uses `NEXT_PUBLIC_BASE_URL` first, then `NEXT_PUBLIC_VERCEL_URL`, then localhost fallback

✅ **All 20 phases complete.**

---

## Execution order

We will work through the phases **top to bottom**, one phase per session.  
Current status: **Phase 20** (SEO & performance) is next.
