# Phase 2 — Core data architecture

This document maps your `roadmap.md` / `DB.md` goals to **Medusa v2.13** so we implement extensions only where the platform does not already cover them.

## Medusa vs `DB.md` (high level)

| `DB.md` concept | Medusa v2 | Notes |
|-----------------|------------|--------|
| **Stores (multi-tenant)** | `Store` + sales channels, API keys | One Medusa deployment can host multiple stores; SaaS-style isolation needs explicit design (per-store API keys, workflows). |
| **Users & roles** | Admin users, RBAC (Medusa) | Different shape from custom `users` / `user_store_roles`; use Medusa’s auth and RBAC for admin; customer auth is separate. |
| **Languages + translations** | `@medusajs/translation` + product/category translation in APIs | Prefer Medusa translation APIs over parallel `*_translations` tables unless you hit limits. |
| **Category tree** | `ProductCategory`: `parent_category_id`, `category_children`, `handle`, `rank` | **Unlimited depth** is already supported. Storefront footer/category templates already walk parent/children. |
| **Category image / extra fields** | `metadata` (JSON) on category | Put image URL or asset key in `metadata`; or link to File module assets later. |
| **Product + description** | `Product` + variants, options, images | Core commerce model; variants carry SKU, prices, inventory. |
| **Specifications / attributes** | Product **options** + option values, or `metadata` | Complex “RAM / Screen size” specs may need a **custom module** if options are not enough. |
| **Cart / orders / payments** | Cart, order, payment modules | Align WhatsApp flow with “draft order” or custom order channel later. |
| **Stock modes** (visible / hidden / no stock) | Inventory + `metadata` on product or store-level setting | Implement as **convention** (e.g. `metadata.stock_mode`) + storefront logic; not a single native enum. |

## What is already “Phase 2.1–2.2” in core Medusa

- **Nested categories** — Create categories in Admin with a parent; API returns `parent_category` and `category_children`.
- **Product ↔ category** — Assign products to categories; filter by `category_id` in the storefront.
- **Variants and options** — Size/color as options; variant-level pricing and inventory.

## Gaps to close (recommended order)

1. **i18n (EN / AR / HE)** — *started*  
   - **Backend:** Translation module enabled in `medusa-config.ts` (`featureFlags.translation`, `@medusajs/medusa/translation`). Run `pnpm db:migrate` then `pnpm seed:locales` (or `medusa exec ./src/scripts/seed-locales.ts`).  
   - **Storefront:** Cookie `_medusa_locale` + `x-medusa-locale` on SDK requests (already wired). **Menu → Language** lists `/store/locales`. Root `<html lang dir>` follows locale (**RTL** for `ar`, `he`).  
   - **Content:** Add translations per resource in **Medusa Admin → Settings → Translations** (product/category fields).  
   - **UI strings:** Optional later: `next-intl` for static copy (nav labels, buttons); commerce data comes from Medusa by locale.

2. **Category UX** — *hero + subcategory tiles*  
   - Product category **Metadata**: `image`, `image_url`, or `thumbnail` (absolute URL) → **hero banner** on category PDP + **thumb** in child-category grid (`category-metadata.ts`, `CategoryHeroImage`).  
   - Slug remains **`handle`** in Medusa. Optional: Admin UI widget for metadata (later).

3. **Stock modes** — *implemented (product metadata)*  
   - Product **Metadata** key `stock_mode`: `track_visible` (default) | `track_hidden` | `no_stock`.  
   - Storefront: `@lib/util/stock-mode` + **PDP** label (`VariantStockStatus`) and add-to-cart uses `isVariantPurchasable`.  
   - **Store-level** default: not wired yet (would need settings or API); set per product for now.

4. **Multi-store (SaaS)**  
    - Tenant model now uses **Medusa store + dedicated sales channel + dedicated publishable API key**.
    - Store-level defaults live in **`store.metadata`**: `tenant_slug`, `storefront_host`, `supported_locales`, `default_locale`, `default_stock_mode`, `sales_channel_id`, `publishable_api_key_id`.
    - Provision with:  
       `pnpm provision:tenant -- <store_name> [tenant_slug] [storefront_host] [locales_csv] [currencies_csv] [stock_mode]`
    - Delete with:  
       `pnpm delete:tenant -- <tenant_slug>`
    - Inspect with:  
       `pnpm describe:tenants -- [tenant_slug]`
    - Runtime tenant lookup for the Next storefront comes from **`GET /tenant?host=...|tenant=...`** in Medusa, so middleware can resolve the publishable key before Store API calls.

5. **Custom SQL from `DB.md`**  
   - Do **not** create parallel tables for catalog while Medusa owns product/category — duplicate sources of truth.  
   - Add **custom modules** only for domains Medusa does not model (e.g. WhatsApp templates, owner-specific settings).

## Next implementation tasks (concrete)

1. ~~Verify **Admin → Categories**: create a 3-level tree and confirm **Store API** returns nested `category_children` (use existing `/categories/[handle]` flow).~~ Done  
   - Verified with script: `pnpm --filter medusa exec medusa exec ./src/scripts/verify-category-tree.ts http://127.0.0.1:9244 <publishable_api_key>`  
   - Script path: `apps/medusa/src/scripts/verify-category-tree.ts` (creates root → child → grandchild and confirms Store API access to deep tree).
2. ~~Spike **locale + translation**: one product with EN/AR titles via Translation module; verify store API locale payloads with:~~ Done  
   `pnpm verify:translations -- http://127.0.0.1:9244 <publishable_api_key> <product_handle> en,ar`
3. ~~Audit translation coverage across the full catalog before doing the next translation batch:~~ Done  
   `pnpm audit:translations -- en ar,he` now passes for the current seeded catalog.
4. ~~Use the audit output to fill missing product/category translations, then spot-check localized Store API payloads with `pnpm verify:translations` / `pnpm verify:category-translations`.~~ Done for the current seeded catalog (EN / AR / HE primary fields).
5. ~~Document **`metadata.stock_mode`** and add a single helper in the storefront to branch display logic.~~ Done (`stock-mode.ts`, product actions).
6. ~~Next Phase 2 slice: model **multi-store / store-level settings** on top of Medusa store + sales channel + publishable key after translation coverage is stable.~~ Done with tenant provisioning + topology inspection scripts.
7. ~~Next Phase 2 slice: route storefront behavior by tenant context (host/header/env) so the correct publishable key and store defaults are selected at runtime.~~ Done with Medusa tenant lookup route + Next middleware/cookie wiring.
8. ~~Next Phase 2 slice: make cart/auth/session state explicitly tenant-scoped in the storefront so cross-tenant browser sessions cannot share the same cart or auth cookies.~~ Done with tenant-scoped cart/auth/cache/locale cookies in the storefront data layer.
9. ~~Next Phase 2 slice: add explicit runtime verification for localized Store API payloads and stabilize the Medusa HTTP integration runner.~~ Done

## Phase 2 close-out

Phase 2 is complete for the current roadmap scope:

- category tree verified through Store API
- product/category translations verified and audited for the seeded catalog
- stock modes implemented through product metadata + storefront logic
- multi-store tenant provisioning / teardown / runtime routing implemented
- tenant-scoped storefront sessions implemented
- Medusa HTTP integration runner passing
- MinIO upload smoke test passing

The next active track is **Phase 3**, starting with product specifications modeled in `product.metadata.specifications` and rendered on the storefront PDP.

Update this file as decisions land; keep `status.md` in sync with the current sub-step.
