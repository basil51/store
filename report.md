
# Project Report

Last updated: **2026-05-03**

## Start Here

This file is the **entry point** for the project.

If you are resuming work, use this order:

1. Read this file first for the current state and the next recommended starting point.
2. Read `status.md` for the detailed implementation log.
3. Read `roadmap.md` for the long-term phase plan.
4. Read `frontend.md` only when the task is about storefront design/theme work.
5. Read `DB.md` only when you need the broader domain-model reference.

## Current starting point

The project is **past the foundation/build stage** and is now in a **stabilize + optimize** phase.

- **Phase 12 is complete for the current scope**: storefront EN / AR / HE localization is in place across the main shopping, account, order, category, collection, cart, checkout, and metadata surfaces.
- **Phase 13 is nearly complete for local scope**: storefront caching, media sizing, payload trimming, CDN policy, and production-mode profiling are green locally.
- **Phase 14 has started** with SEO foundation work plus smart-search groundwork: dynamic sitemap, robots policy, canonical/alternate-language metadata, consistent public-page OpenGraph/Twitter images, functional storefront `q` search, persisted search analytics, an admin readout for top/zero-result queries, and live nav search suggestions.
- The **best current starting point** for new work is: continue **Phase 14** with the next SEO/analytics slice, or move to deployment follow-through when hosting is the priority.

## Executive summary

The repo is in a strong local-development state for the main business features.

- **Foundation is done**: Medusa, Next.js storefront, Docker Postgres/Redis/MinIO, uploads, tenant/store runtime, and pnpm workspace setup are all in place.
- **Core commerce flows are done for current scope**: catalog, variants, presets, cart, checkout, offline payment, local PayPal path, account/order continuity, and admin tools are implemented.
- **Security hardening is done for the current local milestone**: analytics rate limiting, Redis-backed limiter state, Medusa secret validation, hardened storefront cookies, same-origin analytics guard, and same-origin server-action guard are in place.
- **Localization is done for the current storefront scope**.
- **Performance work is nearly complete locally**: the next active lane is Phase 14 SEO/advanced storefront polish.

## Phase snapshot

| Phase | Status | Note |
| --- | --- | --- |
| Phase 1 | Done | Foundation and infrastructure are stable locally. |
| Phase 2 | Done | Core data architecture, tenants, translations, and verification are in place. |
| Phase 3 | Done | Specifications, presets, analytics, and PDP media flow are complete for current scope. |
| Phase 4 | Done | NEXMART storefront redesign is complete for current scope. |
| Phase 4.5 | Stabilization | RTL/LTR and language-copy work is implemented; keep only as regression watch. |
| Phase 5 | Stopped locally | Stripe follow-ups are intentionally deferred until hosted HTTPS deployment. |
| Phase 6 | Active / mostly implemented | WhatsApp ordering, preview, notes, analytics, admin tools, Playwright, and CI are in place. |
| Phase 7.1 | Done | Stock-mode behavior and fallback handling are complete for current scope. |
| Phase 8 | Done | ACL matrix, middleware, API-key restrictions, tests, and ACL Users UI are complete. |
| Phase 9 | Done | Current admin-panel roadmap scope is satisfied. |
| Phase 10 | Done for local scope | PayPal and Offline payment are complete locally; hosted webhook follow-through remains later work. |
| Phase 11 | Stopped at current local milestone | Local security hardening is landed; deploy-time HTTPS/firewall work is deferred. |
| Phase 12 | Done for current scope | Storefront multilingual coverage is complete for active shopper-facing surfaces. |
| Phase 13 | Nearly complete locally | Storefront caching/media-sizing/performance cleanup and production profiling are green for the current local scope. |
| Phase 14 | Started | SEO foundation is underway, and smart-search groundwork now includes `/store?q=...`, persisted search analytics, admin Search Analytics, and typeahead suggestions. |

## What is already complete

### Backend and platform

- Medusa v2 is running with PostgreSQL, Redis, and MinIO.
- Uploads are wired through the Medusa S3 file module against MinIO.
- Tenant/store primitives are implemented, including lookup, provisioning, cleanup, and storefront tenant-scoped session behavior.
- Translation tooling exists for products, categories, and collections.

### Storefront and UX

- NEXMART redesign is in place across the storefront.
- PDP, store, category, collection, cart, checkout, account, order, and shared layout surfaces are localized for EN / AR / HE.
- RTL/LTR behavior is implemented and already passed focused QA on the main surfaces.
- Single-variant PDP purchase flow, stock-mode surfaces, and preset continuity through checkout/order/account are implemented.

### Admin and operations

- ACL roles and store-scoped permissions are implemented.
- Admin has **ACL Users**, **Preset Analytics**, **Preset Defaults**, and WhatsApp settings/analytics support.
- API-key secret access is restricted to `super_admin`.

### Payments and checkout

- Offline payment is fully clarified across the checkout/order flow.
- Local PayPal implementation is in place.
- Stripe groundwork exists, but remaining Stripe-specific local follow-up is intentionally deferred.

## Phase 13 progress so far

The current performance lane is focused on **storefront read-path caching and targeted media/render cleanup**.

The following slices are already landed:

- `currency.ts`: store settings now use tenant-tagged `force-cache` with timed revalidation.
- `ticker.ts`: ticker messages now use timed revalidation.
- `proxy.ts`: region cache fragmentation by per-visitor cache ID was removed.
- `locales.ts`: locale lists now use timed revalidation.
- `catalog-cache.ts`: products, categories, collections, and variants now share a timed catalog cache policy.
- `regions-cache.ts`: region reads now revalidate and the in-process tenant region map now expires.
- `orders-cache.ts`: order/account reads now revalidate and transfer mutations invalidate `orders`.
- `fulfillment-cache.ts`: shipping-option reads now share the `fulfillment` tag with timed revalidation.
- `cart-cache.ts`: `retrieveCart()` now uses short timed revalidation instead of indefinite force-cache reads.
- `thumbnail/index.tsx`: high-volume product cards now pass responsive image `sizes`, while compact cart/order thumbnails default to smaller image candidates.
- `categories.ts` / `collections.ts`: the focused runtime/profile pass found that shared shell reads were still pulling full product relation payloads; footer/category/collection metadata reads now request only the fields needed for navigation and page shells.
- Category, brand, and video raw metadata images now carry explicit dimensions plus decode/load priority hints while preserving compatibility with arbitrary metadata URLs that are not guaranteed to be allowed by Next image remote patterns.
- `next.config.js`: image remote patterns now include a configurable `NEXT_IMAGE_REMOTE_PATTERNS` policy for comma-separated CDN/metadata image hosts, while preserving local MinIO and Medusa Cloud defaults.
- Production-mode validation now passes: the storefront builds with `next build`, starts with `next start`, and the key home/store/category/collection/PDP/cart routes render successfully in production mode. The former build-time Google Fonts dependency was removed so production builds no longer require fetching fonts from Google during build.

## Phase 14 progress so far

The current advanced-features lane started with the SEO system because it is low-risk and deployment-adjacent. The search slices add smart-search groundwork without introducing a separate search service yet.

The first slice is landed:

- `src/app/sitemap.ts`: dynamic sitemap entries now cover localized home, store, collections index, collection detail, category, and product URLs.
- `src/app/robots.ts`: robots policy now allows public storefront crawling while excluding account, cart, checkout, order, and API routes.
- `src/lib/util/seo.ts`: shared canonical URL, localized path, alternate-language, sitemap country-code, nested category path, and social image helpers are in place.
- Public home, store, collections, collection detail, category, and product metadata now include canonical URLs plus `hreflang` / `x-default` alternate-language URLs using crawlable `?locale=` links; category/collection/product pages prefer available metadata/thumbnail images while every public SEO page now falls back to absolute NEXMART OpenGraph/Twitter image URLs.
- `proxy.ts`: crawlable `?locale=en|ar|he` alternate URLs now set the tenant locale cookie while preserving the existing tenant/country routing model.
- `src/lib/util/search.ts`: shared search-query normalization now trims, collapses whitespace, and bounds user-entered queries before they reach product listing reads.
- Storefront `/store?q=...`: the existing nav search form now drives Medusa Store API product search, renders a localized search-results hero with a clear-search action, and preserves the existing sorting/pagination path.
- `src/lib/util/analytics.ts`: search groundwork emits `search_submitted` and `search_results_viewed` browser analytics events so future search improvements can be measured before adding a dedicated search backend.
- Medusa search analytics persistence is in place via `/store/analytics/search`, backed by `search_analytics_events`, with rate limiting and the same storefront trusted-origin proxy pattern as the existing preset/WhatsApp analytics.
- Admin now has **Search Analytics** with `/admin/analytics/search`, showing total searches, result views, zero-result rate, top queries, zero-result queries, and recent search events.
- `src/app/api/search/suggestions/route.ts`: the nav search now fetches product suggestions after two characters using Medusa Store API `q` search and the current country code.
- `src/modules/search/components/search-form/index.tsx`: desktop nav search now shows a localized typeahead dropdown with product suggestions, thumbnails when available, a no-suggestions state, and a "view all results" link.

What remains important:

- Keep auditing storefront read helpers for any remaining stale-forever patterns.
- Treat `payment.ts`, `customer.ts`, and the immediate post-mutation cart/customer refetches as **intentionally dynamic** unless there is a strong reason to change them.
- Phase 13 should now stay in maintenance unless a concrete hotspot appears. Phase 14 can continue with smarter search ranking, recommendation planning, or hosted SEO verification.

## Recommended next starting point

If work resumes now, start here:

1. Continue **Phase 14** with the next SEO slice.
2. Prefer one focused slice at a time, similar to the sitemap/robots/canonical pass.
3. Validate with narrow tests plus production build when route metadata changes.

Recommended concrete options:

1. Improve search ranking/suggestion quality using search telemetry and product metadata.
2. Start recommendation planning using search/preset/product interaction signals.
3. Verify hosted social cards and sitemap output after deployment.

## Current validation state

Recently validated successfully:

- Focused Vitest check passed for `currency.test.ts`.
- Focused Vitest check passed for `ticker.test.ts`.
- Focused Vitest check passed for `proxy-cache.test.ts`.
- Focused Vitest check passed for `locales.test.ts`.
- Focused Vitest check passed for `catalog-cache.test.ts`.
- Focused Vitest check passed for `regions-cache.test.ts`.
- Focused Vitest check passed for `orders-cache.test.ts`.
- Focused Vitest check passed for `fulfillment-cache.test.ts`.
- Focused Vitest check passed for `cart-cache.test.ts`.
- Focused Vitest check passed for `thumbnail/index.test.ts` plus the existing `product-preview/index.test.ts`.
- Focused Vitest check passed for `categories.test.ts` and `collections.test.ts`.
- Focused Vitest check passed for `image-remote-patterns.test.ts`.
- Focused Vitest check passed for `seo.test.ts`, including alternate-language URL and social-image fallback helpers.
- Focused Vitest check passed for `search.test.ts`.
- Storefront build now passes with `/api/search/suggestions` registered.
- Medusa unit check passed for `search-analytics.unit.spec.ts` and `rate-limit.unit.spec.ts`.
- Medusa build now passes with the Search Analytics admin route.
- Production build now passes with `pnpm --filter medusa-next build`.
- Production route profiling via `next start -p 8001` passed for home, store, category, collection, PDP, cart, and expected no-cart checkout 404.
- Earlier storefront builds for the Phase 12 localization pass completed successfully.

Current local limitation:

- Local dev-server stability has improved enough for current route smoke checks, but production-mode local checks over plain HTTP require a manual tenant cache cookie because production cookies are `secure` and normally require HTTPS.

## Known deferrals and blockers

- **Stripe**: keep deferred until the project runs in a real hosted HTTPS environment.
- **PayPal webhook proof**: still a hosted-environment follow-through item.
- **Phase 11 deploy checks**: HTTPS and firewall validation are still deployment-side work.
- **Older databases**: may still need `pnpm --filter medusa shipping:ensure-il` for Israel-shipping parity.

## File guide

Use these root files as the main project map:

- `report.md`: the quick handoff and starting point.
- `status.md`: detailed implementation status and latest landed slices.
- `roadmap.md`: long-term roadmap and phase intentions.
- `frontend.md`: storefront design system and NEXMART UI work.
- `DB.md`: broader data/domain reference.
- `phase2-data-model.md`: Medusa-to-domain mapping details.

## Bottom line

This project is **not at the beginning**. The platform is already feature-rich and locally usable across storefront, admin, translations, ACL, WhatsApp, and checkout/offline-payment flows.

The clearest current engineering direction is:

- keep **Phase 12** treated as complete for the current scope,
- keep **Phase 11** treated as locally complete for the current hardening scope,
- and use **Phase 13** as the main active starting point from now.
