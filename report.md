# Project State Report

Date: 2026-04-29
Source of truth: `status.md` and `roadmap.md`

## Executive Summary

The project is well beyond initial setup. Foundation, core data architecture, advanced product modeling, and the storefront redesign are complete for the current scope. Checkout and cart work reached a stable local milestone and are intentionally paused where Stripe-specific local follow-ups stopped producing enough progress. WhatsApp ordering is actively implemented and already covers localized templates, shopper preview, notes, analytics, admin tooling, Playwright coverage, and CI. Inventory Phase 7.1 is complete for the current scope, which means the next primary roadmap target is Phase 8: user roles and permissions.

In practical terms, the platform already operates like a serious product rather than a scaffold. It supports Medusa v2 + Next.js, multi-tenant runtime primitives, EN/AR/HE translation coverage for the current seeded catalog, MinIO-backed media, preset-driven product merchandising, checkout guardrails, analytics, and a completed NEXMART storefront theme. The biggest deferred area is Stripe in local development, not the general platform foundation.

## Phase Snapshot

| Phase | Planned Goal | Current State |
| --- | --- | --- |
| Phase 1 | Foundation | Done |
| Phase 2 | Core data architecture | Done |
| Phase 3 | Advanced product features | Done |
| Phase 4 | Frontend redesign | Done for current redesign scope |
| Phase 4.5 | RTL/LTR and language-copy completion | Implemented and in stabilization |
| Phase 5 | Cart and checkout | Stopped at current local milestone |
| Phase 6 | WhatsApp integration | Active and substantially implemented |
| Phase 7.1 | Inventory stock modes | Done for current scope |
| Phase 8 | Roles and permissions | Started with backend ACL role/permission scaffold and admin check endpoints |
| Phases 9-16 | Admin, payments, security, scale, testing, deployment | Mostly pending, with some groundwork already landed indirectly |

## What Is Already Delivered

### Platform Foundation

- pnpm monorepo with Medusa backend and Next.js storefront
- Dockerized PostgreSQL, Redis, and MinIO with Medusa S3 file-module integration
- Stable local dev commands and admin build fixes
- Traefik-ready external network for later deployment work

### Commerce and Catalog Core

- Nested category support and category metadata usage
- Product variants, gallery/media support, video support, and structured specifications
- Metadata-backed specification authoring in admin with storefront rendering
- Preset-driven variant merchandising with defaults, quick-switch flows, persistence into cart and order state, and analytics
- Category and product translation tooling with EN/AR/HE coverage for the current seeded catalog

### Multi-Store and Tenant Runtime

- Tenant provisioning and cleanup scripts
- Host-based tenant bootstrap endpoint
- Storefront tenant resolution by host
- Tenant-scoped session, cart, auth, cache, and locale behavior

### Frontend and UX

- NEXMART theme rollout completed across storefront, checkout, account, and major order surfaces
- RTL/LTR direction support implemented across the main high-impact UI areas
- Shared EN/AR/HE UI-copy layer on key storefront surfaces
- Product page improvements including gallery, zoom, preset flows, and stock-state clarity

### Checkout and Conversion

- Checkout step guardrails and deep-link protection
- Better payment and review readiness messaging
- Order-assurance and conversion-focused review improvements
- Checkout analytics hooks and targeted QA validation
- Playwright coverage for checkout deep-link matrix and happy path

### WhatsApp Ordering

- PDP and cart WhatsApp ordering flows
- Locale-aware WhatsApp templates for EN/AR/HE
- Shopper preview modal before redirecting to WhatsApp
- Optional shopper notes with backward-compatible template behavior
- WhatsApp analytics persistence and admin reporting
- Storefront and admin Playwright coverage plus dedicated CI workflow

### Inventory Behavior

- Product-level stock modes: `track_visible`, `track_hidden`, `no_stock`
- Store-level default stock mode fallback
- Alignment across browse cards, PDP, cart, admin controls, and tests

## Where The Roadmap Is Ahead Or Behind Reality

The roadmap is directionally correct, but the actual implementation has already gone deeper than the high-level phase labels suggest. Multilingual support, analytics, testing, CI, and multi-store runtime primitives are more advanced than the roadmap alone implies. At the same time, the payments phase should currently be treated as intentionally paused in local development, not as an active execution stream.

This means the real project state is:

- ahead of the roadmap in product depth for Phases 3, 4, 6, 7, 12, 14, and 15
- paused rather than incomplete in the remaining local part of Phase 5
- ready to shift primary attention toward Phase 8 instead of continuing to loop on local Stripe issues

## Current Risks, Deferrals, and Caveats

- Local Stripe webhook replay reaches Medusa successfully, but payment capture-state advancement is still not behaving as expected in the local dev flow.
- Stripe card-field remount behavior after payment-session initiation remains unreliable locally and is deferred.
- These Stripe issues are intentionally not the current blocker for the overall roadmap; they should be revisited in a server-hosted HTTPS-capable environment.
- Older local databases may still need Israel shipping normalization.
- Some integration verification depends on local Postgres availability.
- Free-shipping merchandising remains hidden locally while `free_shipping_threshold` is unset.
- Development secrets are still development-grade and must be rotated before any shared or production use.

## Recommended Next Steps

1. Continue Phase 8 from the landed ACL scaffold: map role context to real Medusa admin users and store assignments.
2. Keep Phase 4.5 in light stabilization mode so new UI work stays direction-safe and localized across EN/AR/HE.
3. Treat Phase 6 as polish and optimization work unless a new WhatsApp gap appears.
4. Revisit deferred Stripe work only after moving into a server-hosted HTTPS-capable environment.
5. When Phase 8 is defined, use it to shape later Phase 9 admin-panel work rather than building admin features without an access model.

## Bottom Line

The project has crossed from setup into platform-building. The strongest completed areas are foundation, catalog architecture, advanced product merchandising, storefront design, tenant primitives, and WhatsApp ordering. The clearest unfinished business is no longer basic commerce functionality; it is controlled platform expansion, beginning with permissions and access control, while leaving Stripe-specific local issues deferred until the environment is appropriate for finishing them cleanly.