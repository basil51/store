# 🚀 Multipurpose E-Commerce Platform Roadmap
### Stack: Medusa + Next.js + PostgreSQL

### Progress snapshot (living)

| Phase | Status |
|-------|--------|
| **Phase 1 — Foundation** | **Done** (local Medusa + Next starter + Docker Postgres/Redis/MinIO + pnpm workspace; Traefik as external network). |
| **Phase 2 — Core data architecture** | **Done** — category tree, variants, stock modes, seeded-catalog translation coverage, tenant provisioning/cleanup primitives, storefront tenant routing, tenant-scoped session behavior, HTTP integration verification, and MinIO upload smoke testing are in place. |
| **Phase 3 — Advanced product features** | **Done** — specifications are metadata-backed, editable in Medusa admin, can bind to selected Medusa variant options on the PDP, template recommendations react to richer product signals, named variant combinations can be authored and synced from real variants, one combination can be flagged as the default preset, and the storefront uses them as guided presets plus separate PDP quick-switch merchandising. The default preset now drives default-first PDP behavior, one-click restore, URL-level preset state (`preset`), line-item metadata persistence, analytics events (`preset_selected`, `preset_added_to_cart`, `preset_purchased`), cart/checkout/order grouping, and store-level preset defaults by product type via Admin → **Preset Defaults**. |
| **Phase 4 — Frontend** | **Completed for current redesign scope** — NEXMART storefront plan tracked in **`frontend.md`** is finished. |
| **Phase 5 — Cart & Checkout** | **Stopped at current local milestone** — completed checkout/cart improvements and local Stripe groundwork stay in place, but the remaining local Phase 5 follow-ups are intentionally skipped for now because the last local steps are looping. Revisit only later if a server-hosted HTTPS environment makes those deferred items worth reopening. |
| **Phase 6 — WhatsApp Integration** | **Started** — existing WhatsApp/cart-settings work is reconciled; PDP quantity now drives add-to-cart and click-to-order, templates support richer placeholders, cart/PDP WhatsApp lines include more ordering context, localized EN/AR/HE WhatsApp templates now drive generated message copy, the generated message body now pulls current-locale option/spec labels when catalog metadata provides them, Admin → Cart Settings now offers locale-aware editing plus live preview for PDP vs cart flows using localized store-API product reads, shoppers can now add an optional WhatsApp note from PDP/cart with backward-compatible `{{customer_note}}` template support, Admin → WhatsApp Analytics now includes daily trend charting plus richer date/source/locale/event filtering, Playwright coverage now exercises both storefront and admin WhatsApp regressions, and a dedicated GitHub Actions workflow now runs the WhatsApp suite separately from checkout coverage. |
| **Phase 7 — Inventory Models** | **7.1 complete for current scope** — stock-mode behavior is aligned across PDP, cart, and browse with store-level fallback + tests. |
| **Phase 8 — Roles and permissions** | **Active (hardened slice)** — ACL resolves role/store scope from authenticated admin users, enforces middleware on broad admin route groups, adds `api_keys.secrets` (super_admin only) for Medusa **secret** admin API keys, forces publishable-only list queries plus response filtering for everyone else, and ships ACL unit tests plus HTTP integration coverage (`health.spec.ts`). |
| Phases 9+ | Pending — continue after the Phase 8 track. |

*Details: see root `status.md`.*

---

# 🎯 Vision
Build a scalable, multilingual, multi-tenant e-commerce platform that supports:
- Unlimited category levels
- Advanced product configurations
- Multiple business models (stock / no-stock)
- WhatsApp-based ordering + full checkout
- Strong admin/control panel
- Polished, premium storefront theme with strong UX across desktop + mobile
- Future SaaS product

---

# 🧱 PHASE 1 — Foundation (Week 1–2) ✅ Done

## 1.1 Tech Setup
- [x] Backend: Medusa (v2, `apps/medusa`)
- [x] Frontend: Next.js (App Router starter, `apps/medusa-storefront`)
- [x] DB: PostgreSQL (Docker; host port **5433**)
- [x] Cache: Redis (Docker; host port **6380**)
- [x] Storage: S3-compatible MinIO in Docker (host **9100** / console **9101**); Medusa **S3 file module** + `minio-init` bucket (`medusa`)

## 1.2 Dev Environment
- [x] Docker setup (infra: postgres, redis, minio)
- [x] External **traefik** Docker network declared (your Traefik stays separate)
- [ ] **Later:** `medusa` + storefront as Docker services behind Traefik (when you deploy)

## 1.3 Base Installation
- [x] Install Medusa server + admin dependencies (`@medusajs/dashboard`, `@medusajs/draft-order`)
- [x] Connect PostgreSQL + run migrations
- [x] Admin available with `pnpm dev:medusa` (e.g. port **9244** → `/app`)

---

# 🧠 PHASE 2 — Core Data Architecture (CRITICAL) ✅ Done

## 2.1 Categories System (Advanced)
- Support:
  - Unlimited nesting (tree structure) — **covered by Medusa `ProductCategory`** (`parent_category_id` / `category_children`); storefront already uses tree in footer + `/categories/[handle]`.
- Fields:
  - name (multi-language) — **gap**: use **Translation module** or `metadata` per locale (see `phase2-data-model.md`).
  - slug — **`handle`** in Medusa; align URLs with storefront routes.
  - parent_id — **`parent_category_id`**.
  - image — **gap**: `metadata.image` (or file key) until a richer pattern is defined.
  - metadata — **native** `metadata` JSON on category.

## 2.2 Product System
- Product:
  - title (multi-language)
  - description (multi-language)
  - images (gallery)
  - category_id

## 2.3 Product Variants (VERY IMPORTANT)
Each product can have:
- Size (S, M, L)
- Color (Red, Blue)
- Custom specs

Each variant:
- price
- stock
- SKU

👉 This is how price changes based on selection

---

# 🧩 PHASE 3 — Advanced Product Features ✅ Done

## 3.1 Specifications System
- Custom attributes:
  - label (e.g., "RAM")
  - values (e.g., 8GB, 16GB)
- Current slice: product metadata `specifications` now supports Medusa admin authoring plus PDP rendering for structured label/value groups.

## 3.2 Dynamic Product Builder
- Current bridge: specification entries can reference an existing option title (for example `Color` or `Size`) so the PDP reflects the selected variant dynamically.
- Admin now has a structured specifications editor for grouped static rows and option-linked rows, with linked rows choosing from the product's real Medusa options and product-aware reusable templates like Display, Dimensions, Performance, and Finish & Options while continuing to persist into `metadata.specifications`. Merchants can also save preferred template defaults per product to bias the recommendation order, template recommendations now react to richer product signals including title and option names instead of only type/collection/category context, and named option-value combinations can now be saved into `metadata.variant_combinations`, synced from real variant rows, and reused as explicit admin-side variant-merchandising presets.
- The storefront PDP now reads `metadata.variant_combinations` as guided preset cards that can apply a full option pairing in one click while showing badge/summary merchandising hints, also surfaces them in a separate “Recommended setups” quick-switch section near the media/specs flow, and will prefill the page from a flagged default preset when no explicit variant is selected.
- Default-preset follow-up started: guided/quick-switch preset lists now prioritize the flagged default and the action area exposes a one-click “Restore default setup” path after manual option overrides.
- Workflow-driving follow-up started: preset identity now persists in PDP URL state (`preset`) and into cart line-item metadata so selected combinations remain visible and actionable after add-to-cart.
- Checkout/order follow-up started: the same setup metadata badge now surfaces in checkout summary line items and order confirmation/details line items for continuity after purchase.
- Account/mini-preview follow-up started: setup metadata is now surfaced in account order-card item previews and cart-dropdown compact item previews so preset context stays visible in lightweight post-add/post-purchase surfaces.
- Analytics follow-up completed (ingest + report + admin UI): preset-level events emit for selection (`preset_selected`), add-to-cart (`preset_added_to_cart`), and purchase (`preset_purchased`) with product/preset identifiers and source context, flow through storefront proxy `/api/analytics/preset` into Medusa `/store/analytics/preset`, persist in Postgres table `preset_analytics_events`, and are queryable via `pnpm --filter medusa run preset:analytics` or admin dashboard at **Preset Analytics** (shows event totals, top presets, top products, purchase metrics, revenue aggregates).
- Checkout/order display follow-up completed (display standards): checkout summary and order details pages now group line items by preset when 2+ items with different presets present, showing group headers with preset title, badge, item counts for clear preset context throughout purchase flow.
- Store-level defaults follow-up completed: global preset combinations can now be saved by product type in Admin → **Preset Defaults**, consumed automatically by products that do not have local `metadata.variant_combinations`, and loaded into the product metadata widget as a starting point for per-product overrides.

## 3.3 Product Media
- Multiple images
- Thumbnail + zoom image
- Optional video

---

# 🖥️ PHASE 4 — Frontend (Next.js)

## 4.1 Theme & Visual Design System (NEW PRIORITY)
- Define a clear brand direction for the storefront
- Create a cohesive theme:
  - typography
  - color system
  - spacing
  - buttons / cards / badges / forms
- Make the store feel modern, premium, and trustworthy
- Ensure the UI looks good on:
  - desktop
  - tablet
  - mobile

## 4.2 Storefront Pages
- Home
- Category page (recursive categories)
- Product page
- Cart / checkout pages should visually match the theme

## 4.3 Homepage / Collection UX
- Strong hero section
- Featured categories / collections
- Promotional sections / banners
- Better product cards and hover states
- Consistent spacing and layout rhythm

## 4.4 Product Page (CRITICAL UX)
- Image gallery:
  - small thumbnails
  - click → large preview
- Variant selector:
  - color / size / specs
- Dynamic price update
- Stock status
- Better visual hierarchy, trust signals, and purchase-focused layout

## 4.5 RTL + LTR Support
- Arabic (RTL)
- Hebrew (RTL)
- English (LTR)

Current status:
- Direction foundation is in place (locale-aware document direction and locale propagation).
- First implementation slice is now in: checkout/cart high-traffic surfaces started migrating from physical left/right utility usage to direction-safe logical behavior (address select, review, discount code, shared input/select/price controls, cart item/table/preview/dropdown alignment).
- Second implementation slice is now in: top-navigation and selector surfaces migrated to logical direction behavior (language selector, country selector, currency selector, category sidebar, category nav underline/spacing behavior).
- Third implementation slice is now in: remaining shared/layout hotspots migrated to logical direction behavior (`side-menu`, `modal`, `filter-radio-group`, `ticker-track`).
- Fourth implementation slice is now in: account/layout template surfaces migrated to logical direction behavior (`account address edit/transfer-request alignment`, `footer nested category spacing`, `nav logo spacing marker`).
- Fifth implementation slice is now in: order/store/category support surfaces migrated to logical direction behavior (`order item row alignment`, cart/order skeleton table alignment, store refinement list inline spacing, category breadcrumb spacing).
- Sixth implementation slice is now in: remaining product/home/shipping hotspots migrated to logical direction behavior (`promo-banners`, `product-preview` + wishlist overlay, `image-gallery` overlays/lightbox controls/counter centering, `product-actions` + `mobile-actions`, `recommended-setups`, `product-tabs` accordion glyph, `free-shipping-price-nudge` popup anchor).
- RTL testing support is now in-header with simplified UX: a dedicated language QA switcher appears in both main nav and checkout header, showing only `EN`/`AR`/`HE` in the trigger and full language names in the menu, with access key `L` for quick focus.
- First language-copy completion slice is now in for active hotspots using shared dictionary/context wiring (promo banners, product preview CTA/badge fallback, image gallery labels + ARIA, product actions and mobile actions state text, recommended setups labels, free-shipping nudge copy) with EN/AR/HE coverage.
- Focused desktop + mobile RTL/LTR QA sweep is complete for EN/AR/HE on home and PDP hotspot surfaces, including locale switch validation and `lang`/`dir` checks.
- Broader non-hotspot language-copy completion is now in for home/layout/PDP-support surfaces (hero, flash-sale strip, brand strip, category pills, featured product rails, nav/footer, category nav/sidebar labels, related products, and product tabs), using the shared EN/AR/HE dictionary.
- Account/login localization completion is now in: account nav, overview, profile sections/forms, address add/edit modals, order-transfer form, and login/register template/forms now use locale-aware EN/AR/HE copy.
- Account route metadata localization is now in: account/login/profile/addresses/orders/order-details route `title` and `description` now resolve per locale via `generateMetadata`.
- A final targeted desktop + mobile QA cycle was completed after this broader copy pass, again validating locale switching and `lang`/`dir` behavior (`en/ltr`, `ar/rtl`, `he/rtl`) on home + PDP.
- Recommended sequencing: keep Phase 4.5 as a light stabilization/regression track in parallel with Phase 5 for any newly introduced copy or catalog-data translation gaps.

👉 Use:
- next-intl or i18n
- dynamic direction switching

## 4.6 Frontend Quality Pass
- Remove starter-template look and replace it with a custom storefront identity
- Improve empty states, loading states, and section consistency
- Review full storefront flow for visual quality before moving deeper into checkout polish

---

# 🛒 PHASE 5 — Cart & Checkout

Current progress:
- Stripe backend wiring, readiness verification, local provider sync, and payment-session initialization are complete.
- Israel shipping coverage was normalized for the active checkout region.
- Full Stripe test-mode order completion is now verified with a dedicated Medusa script.
- Storefront Stripe checkout fixes landed for `return_url`, immutable `clientSecret` handling, delivery-step crash repair, and stable default expansion of the credit-card payment path.
- The remaining local payment-step gap is narrowed to actual Stripe card-field remount after payment-session initiation; that is deferred for now.
- Per current project decision, no further Stripe-specific work is active on the local machine. Stripe UI/webhook follow-ups stay paused until the project is running on a server-hosted HTTPS-capable environment.
- Cart settings now extend beyond cart/checkout surfaces into a PDP free-shipping teaser driven by the existing `free_shipping_threshold` setting.
- Preset default safety is now hardened: PDP selection validates `v_id` before use, falls back to a deterministic preferred setup (explicit default, otherwise first valid preset), and preset parsers/sanitizers across storefront/admin/backend normalize conflicting multiple-default data to one effective default.
- Payment/review conversion clarity is improved: payment now shows explicit readiness blockers (missing delivery, missing method, incomplete card details) with direct guidance back to delivery when needed, and review now shows a three-step completion checklist plus a one-click jump to the first missing step before place-order is enabled.
- Checkout summary now carries a compact progress tracker with active-step context, next-step guidance, and a one-click jump action to the first missing step, keeping conversion intent clear while users scroll totals/items.
- Final-step assurance messaging is now visible right above place-order: secure payment handling, charge transparency, and instant confirmation expectations are surfaced in a compact trust card, with CTA copy aligned to “Place secure order.”
- Place-order disabled states now include explicit inline reasons (session preparation, Stripe form loading, missing method selection, incomplete prerequisites, active submission), reducing unclear final-step blockers and lowering abandonment from ambiguous disabled buttons.
- Review now includes a compact payment method + estimated confirmation timing strip at the top, giving shoppers immediate clarity on payment context and post-click expectations before they place the order.
- A micro-commitment “What happens next” strip now sits directly above place-order to clarify immediate outcomes after click (secure placement, confirmation page, confirmation email), reducing final-moment uncertainty.
- Review now includes a lightweight edit-shortcuts row (Address / Delivery / Payment) so shoppers can jump directly to the step they want to correct without scrolling back through the full checkout flow.
- Lightweight checkout friction analytics hooks are now in place for measurement (step changes, blocker impressions, place-order attempt/fail, and order-confirmation success), so the next conversion slices can be prioritized with signal instead of guesswork.
- A focused desktop/mobile checkout QA pass has now validated the updated Address → Delivery → Payment → Review flow and confirmed real event emission for the new analytics hooks; redirect-driven successful placements are now excluded from false `checkout_place_order_fail` tracking.
- Payment-session initialization is now hardened against transient stale-session errors: when checkout receives `PaymentSession ... not found`, it retries once automatically before showing an error, reducing drop risk during rapid payment-step changes.
- Checkout step guardrails are now in place: invalid/missing `?step=` states and inaccessible deep links auto-route to the first required step, preventing step-skipping dead ends while preserving valid earlier-step edits.
- Guardrail redirects now emit blocker analytics (`checkout_blocker_shown` with `incomplete_checkout_requirements`) when shoppers attempt inaccessible steps, improving funnel diagnostics for future conversion slices.
- Guardrails now also run server-side on the checkout page, so inaccessible deep links are corrected before render (no transient review-step paint before redirect).
- Live checkout verification with an active cart confirmed deep-link `step=review` routes directly to `step=address` when address/delivery/payment prerequisites are incomplete.
- Checkout coverage is now automated in Playwright with both the deep-link matrix (`apps/medusa-storefront/e2e/checkout-deeplink-matrix.spec.ts`) and a full local manual-payment order flow (`apps/medusa-storefront/e2e/checkout-happy-path.spec.ts`), and GitHub Actions (`.github/workflows/checkout-deeplink-matrix.yml`) runs the checkout suite in CI.
- Checkout regression coverage now exercises edit-from-review paths for both Address and Delivery updates: from Review, the shopper can jump back to either step, work forward through checkout again, and still complete the order.
- Local Stripe webhook replay reached the Medusa endpoint successfully, but capture-state advancement after webhook delivery is still blocked in the current local dev setup, so that item is skipped for now rather than blocking the roadmap.
- Current decision: stop Phase 5 at this local milestone. The remaining local Phase 5 follow-ups are intentionally skipped for now because the last local checkout steps are looping without enough forward progress. Continue with the next roadmap phase instead, and only reopen deferred Phase 5 work later if the deployment environment or a clearer execution path changes the tradeoff.

## 5.1 Cart System
- Add/remove items
- Update quantity
- Store in session or DB

## 5.2 Checkout Options
### Option A:
- Full checkout (Stripe / PayPal)

### Option B:
- WhatsApp order:
  - Generate message:
    "Hello, I want to order: ..."
  - Redirect to WhatsApp API

---

# 💬 PHASE 6 — WhatsApp Integration

Current note:
- Phase 6 is now in progress. The first implementation slice reconciles the earlier cart-settings/WhatsApp work with the current storefront: PDP quantity now drives both add-to-cart and WhatsApp click-to-order, shared WhatsApp templates support richer placeholders (`{{product_name}}`, `{{product_specs}}`, `{{quantity}}`, `{{unit_price}}`, `{{line_total}}`, `{{preset_title}}` in addition to the existing cart placeholders), and cart/PDP WhatsApp message lines now include more variant/setup context where available.
- The next slice localizes the generated WhatsApp message copy itself for EN / AR / HE by adding locale-specific template storage with backward-compatible fallback to the legacy single-template field. Storefront WhatsApp generation now picks the active shopper locale's template, setup labels inside generated message lines are localized as well, and WhatsApp detail lines now prefer current-locale option/spec labels from the product payload when those translated catalog values exist.
- Admin → Cart Settings now documents those placeholders and includes locale-aware template editing plus live preview with PDP click-to-order and cart-summary modes, so store owners can verify both the rendered message and final `wa.me` link per locale before saving. The preview now works against a selected real product and variant from the catalog via localized Store API reads, with the older localized sample content kept only as a fallback when no live preview item is available.
- Storefront shopper flow now mirrors that confidence step: PDP and cart WhatsApp actions open a localized preview modal before redirect, so the shopper can review or copy the exact generated message and then continue into WhatsApp intentionally instead of being sent away immediately.
- WhatsApp funnel measurement now persists server-side and is visible in Admin → WhatsApp Analytics: preview opens, message copies, and continue clicks flow through storefront/backend sinks into Postgres and surface as funnel, source, locale, product, and preset summaries for review.
- Admin analytics follow-up completed: WhatsApp Analytics now also includes daily trend charting plus richer date/source/locale/event filtering so the funnel can be inspected over time without leaving the admin.
- Storefront/admin WhatsApp ordering polish continues: PDP and cart now expose an optional shopper note field, the generated message supports `{{customer_note}}` with fallback append behavior for older templates, and Admin → Cart Settings previews that note placeholder per locale before save.
- Storefront regression coverage now includes `apps/medusa-storefront/e2e/whatsapp-note-flow.spec.ts`, which validates PDP shopper-note preview, add-to-cart continuation, cart shopper-note preview, EN / AR / HE localized preview affordances, and localized product/option detail lines inside the generated message body in one browser session.
- Admin regression coverage now includes `apps/medusa-storefront/e2e/whatsapp-admin.spec.ts`, which verifies locale-aware Cart Settings preview note rendering and seeded WhatsApp Analytics filter behavior after admin login.
- WhatsApp CI now runs from `.github/workflows/whatsapp-e2e.yml`, while `.github/workflows/checkout-deeplink-matrix.yml` stays checkout-only.

## 6.1 Click-to-Order
- Generate dynamic message:
  - product name
  - selected specs
  - quantity

## 6.2 Admin Config
- Store owner sets:
  - WhatsApp number
  - default message template

---

# 🏪 PHASE 7 — Inventory Models (IMPORTANT)

Current note:
- The first follow-up slice is now in: product `metadata.stock_mode` continues to drive PDP stock messaging, cart quantity selection now uses the same shared storefront stock-mode rules as PDP quantity limits, and browse cards can now surface stock-mode pills when their product payload includes tracked inventory data. Those shopper-facing stock labels now use the shared EN / AR / HE UI-copy layer, and store-level `default_stock_mode` now acts as the fallback wherever a product does not define its own stock mode.
- Store-level fallback management is now available in Admin → **Cart Settings** via a dedicated **Default Stock Mode** selector, so teams can switch the default tracked/hidden/on-demand behavior without editing metadata manually.
- Regression safety for this fallback is now covered in storefront unit tests (`src/lib/data/currency.test.ts`) so valid/invalid `default_stock_mode` API values stay predictable.
- Backend API normalization coverage is now added in Medusa HTTP integration tests for `/store/store-currency-config`, ensuring invalid `default_stock_mode` values fall back to `track_visible`.
- **7.1 closeout status:** implementation and storefront-side guardrails are complete (shared logic + PDP + listing + cart + admin control + component/unit coverage). Medusa HTTP integration assertions are implemented and pass when the local integration Postgres target is reachable.

## 7.1 Stock Modes
- Mode 1: Track stock (numbers visible)
- Mode 2: Track stock (hidden numbers)
- Mode 3: No stock (on-demand ordering)

👉 This solves:
- stores that order from suppliers

---

# 👥 PHASE 8 — User Roles & Permissions

## 8.1 Roles
- Super Admin
- Store Owner
- Manager
- Staff

## 8.2 Permission keys (canonical; `apps/medusa/src/shared/access-control.ts`)
- `users.manage` — admin users and invites; ACL POST check route.
- `stores.manage` — reserved for cross-store platform operations (currently only `super_admin` via the full matrix).
- `catalog.manage` — catalog, media uploads, inventory, and **read-only** GET for regions and sales channels.
- `orders.manage` — orders and related flows (returns, exchanges, claims, order edits, draft orders).
- `settings.manage` — store settings, mutating regions and sales channels, custom admin config route, publishable API key operations, and sales-channel links on API keys.
- `api_keys.secrets` — **super_admin only**: create/list-filter/read/update/revoke/delete **secret** admin API keys; see §8.4.
- `analytics.read` — preset and WhatsApp analytics admin endpoints.

Role → permission assignment is defined in `ROLE_PERMISSIONS` (same file). `super_admin` receives every key; other roles receive the subset needed for store operations without user administration or secret keys.

## 8.3 Admin route → permission matrix (`apps/medusa/src/api/middlewares.ts` + `acl-http.ts`)

| Permission | Admin path patterns | HTTP methods |
|------------|---------------------|--------------|
| `users.manage` | `/admin/users*`, `/admin/invites*` | all guarded verbs |
| `users.manage` | `/admin/acl/roles` | POST (permission check API) |
| `analytics.read` | `/admin/analytics/preset`, `/admin/analytics/whatsapp` | GET |
| `catalog.manage` | `/admin/products*`, `/admin/product-categories*`, `/admin/product-types*`, `/admin/product-tags*`, `/admin/collections*`, `/admin/inventory-items*`, `/admin/stock-locations*`, `/admin/uploads*` | GET, POST, PUT, PATCH, DELETE |
| `catalog.manage` | `/admin/regions*` | GET only |
| `catalog.manage` | `/admin/sales-channels*` | GET only |
| `orders.manage` | `/admin/orders*`, `/admin/returns*`, `/admin/exchanges*`, `/admin/claims*`, `/admin/order-edits*`, `/admin/draft-orders*` | GET, POST, PUT, PATCH, DELETE |
| `settings.manage` | `/admin/store*`, `/admin/custom` (GET) | as listed |
| `settings.manage` | `/admin/regions*` | POST, PUT, PATCH, DELETE |
| `settings.manage` | `/admin/sales-channels*` | POST, PUT, PATCH, DELETE |
| **Dynamic** | `/admin/api-keys*` | See §8.4 (`requireApiKeyAcl` in `apps/medusa/src/api/middlewares/api-key-acl.ts`) |

Routes **not** listed here still use Medusa’s default admin authentication only; a future pass can map additional modules (campaigns, promotions, notifications, …) to permissions.

## 8.4 Secret admin API keys (`/admin/api-keys*`)
- Middleware: `requireApiKeyAcl` + shared checks in `apps/medusa/src/api/acl-http.ts`.
- **Publishable** keys: require `settings.manage` (create/update/delete/revoke, list, GET by id, link sales channels).
- **Secret** keys: any create with `type: "secret"`, GET list filtered to secrets only (`?type=secret`), or any operation on an existing secret key by id → requires **`api_keys.secrets`** (super_admin only).
- **List lockdown**: roles **without** `api_keys.secrets` get `type=publishable` forced on `GET /admin/api-keys` and a defensive `res.json` filter so secret rows never appear in list payloads.
- Dev seeding: `pnpm --filter medusa seed:acl-roles` (`apps/medusa/src/scripts/seed-acl-role-users.ts`).

## 8.5 Role context source (implemented)
- Request override (for controlled checks): `x-store-role` and `x-store-id` (or query fallback).
- Authenticated user metadata (default path):
  - `metadata.acl_role` (or `metadata.role`)
  - `metadata.acl_store_ids` / `metadata.store_ids` (plus single-store fallback keys)
- Store-scope enforcement:
  - when `store_id` is requested, access is limited to assigned stores unless role is `super_admin`.

## 8.6 Tests and verification
- Unit: `apps/medusa/src/__tests__/shared/access-control.unit.spec.ts` (`pnpm exec jest` from `apps/medusa`).
- HTTP integration: `apps/medusa/integration-tests/http/health.spec.ts` — includes ACL POST checks, store scope + analytics, secret API key denial, publishable-only list behavior, and super_admin list visibility (`pnpm --filter medusa test:integration:http`; requires Postgres on host port **5433** as in `status.md`).

---

# 🧑‍💼 PHASE 9 — Admin Panel (VERY IMPORTANT)

## 9.1 Dashboard
- Sales overview
- Orders
- Top products

## 9.2 Product Management
- Add/edit/delete
- Manage variants
- Upload images

## 9.3 Category Management
- Tree view editor

## 9.4 Orders
- Order status:
  - pending
  - confirmed
  - shipped
  - completed

---

# 💳 PHASE 10 — Payments

## 10.1 Integrations
- Stripe
- PayPal
- Manual (cash)

## 10.2 Future:
- Local gateways (Israel / Middle East)

---

# 🔐 PHASE 11 — Security

## 11.1 Backend
- JWT authentication
- Role-based access control
- Rate limiting

## 11.2 Frontend
- Secure API calls
- CSRF protection

## 11.3 Infrastructure
- HTTPS
- Firewall rules

---

# 🌍 PHASE 12 — Multi-Language System

## 12.1 Content Translation
- Products
- Categories
- UI

## 12.2 Strategy
- Store translations in DB
OR
- Use translation tables

---

# ⚡ PHASE 13 — Performance & Scaling

## 13.1 Caching
- Redis caching
- CDN for images

## 13.2 Optimization
- Lazy loading images
- Server-side rendering

---

# 📈 PHASE 14 — Advanced Features (YOUR ADVANTAGE 🔥)

## 14.1 AI Features
- Product recommendations
- Smart search

## 14.2 Analytics
- Conversion tracking
- User behavior

## 14.3 SEO System
- Meta tags per product
- Sitemap

## 14.4 Multi-Store (Future SaaS)
- Each user = store
- Separate configs

---

# 🧪 PHASE 15 — Testing

- Unit tests
- API tests
- UI testing

---

# 🚀 PHASE 16 — Deployment

## 16.1 VPS Setup
- Docker Compose
- Nginx / Traefik

## 16.2 CI/CD
- GitHub Actions

---

# 🧠 FINAL NOTES

## Why PostgreSQL?
- Relational → perfect for:
  - categories
  - variants
  - orders
- Strong consistency
- Scalable

## Why Medusa?
- Saves 6–12 months backend work
- Already has:
  - products
  - orders
  - payments

## Your Advantage
You are not building a store…
👉 You are building a SYSTEM

---

# 🏁 END GOAL

A platform that can:
- Run multiple stores
- Support multiple languages
- Handle complex products
- Scale into SaaS
