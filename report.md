# Project State Report

Date: **2026-05-03**  
Source of truth: `status.md`, `roadmap.md`, and the repo as of this report.

## Executive Summary

The platform is in **post–Phase-8** shape for access control: roles and permissions are defined in code, enforced on major Medusa admin route groups, secret admin API keys are locked down for non–`super_admin` users, and operators can assign **`acl_role`** / **`acl_store_ids`** from **Admin → ACL Users** instead of editing metadata by hand. Unit and HTTP integration tests cover ACL and API-key behavior.

**Phase 8 is treated as complete for the agreed core scope.** **Phase 9 (admin panel track) is complete for the current scope**: **9.1** store overview is done, **9.2** product management is covered by **Catalog hub** plus native Medusa product screens, and **9.3 / 9.4** are satisfied by Medusa Dashboard capabilities unless a custom requirement appears.

Long-standing caveats unchanged: **Phase 5 Stripe** remains intentionally paused locally, so **Phase 10 should be treated as payment completion from that local milestone rather than as a greenfield payments build**. PayPal is complete for the current local scope, and the former manual provider has now been clarified as **Offline payment** across the storefront checkout/order flow. Hosted webhook/public-HTTPS follow-through remains deferred. **Phase 11 is now stopped at the current local milestone after six landed slices**: rate limiting on the anonymous store analytics ingest routes, Redis-backed shared analytics counters for multi-instance safety, Medusa JWT/cookie secret hardening at config load, storefront cookie-boundary hardening for tenant-scoped metadata cookies, trusted-origin protection on the custom storefront analytics POST routes, and trusted-origin enforcement on state-changing storefront server actions across cart/customer/checkout-related flows. The current local storefront CSRF/origin hardening pass is now complete for active write surfaces, and coverage now spans helper-level, action-level, and runtime-facing rejection checks. The remaining HTTPS and firewall work is explicitly deferred until the real server is deployed and started with its HTTPS edge, and **Phase 12 is now the next primary lane**, while **Phase 4.5** (RTL / locale copy) stays in light stabilization and **Phase 6** WhatsApp can receive polish as needed.

## Phase Snapshot

| Phase | Planned goal | Current state |
| --- | --- | --- |
| Phase 1 | Foundation | Done |
| Phase 2 | Core data architecture | Done |
| Phase 3 | Advanced product features | Done |
| Phase 4 | Frontend redesign | Done for current redesign scope |
| Phase 4.5 | RTL/LTR + language copy | Implemented; stabilization / regression watch |
| Phase 5 | Cart & checkout | Stopped at current local milestone; Stripe follow-ups deferred |
| Phase 6 | WhatsApp integration | Active / largely implemented |
| Phase 7.1 | Inventory stock modes | Done for current scope |
| **Phase 8** | **Roles & permissions** | **Done (core scope)** — matrix, middleware, API keys, tests, **ACL Users** admin UI |
| **Phase 9** | **Admin panel (roadmap)** | **Completed for current scope** — 9.1 store overview, 9.2 Catalog hub + Medusa product screens, 9.3 categories, and 9.4 orders are all covered |
| **Phase 10** | **Payments** | **Payment completion lane** — Stripe is mostly covered locally and deferred for hosted HTTPS follow-up; PayPal plus Offline payment semantics are complete for the current local scope, and the remaining payment work is hosted webhook/public-HTTPS follow-through |
| Phase 11 | Security | Stopped at current local milestone — local app hardening slices are in; HTTPS and firewall checks are deferred until deploy/start on the real server |
| Phases 12+ | i18n at scale, performance, etc. | Phase 12 is the next primary lane |

## What landed for Phase 8 (high level)

- **Matrix & helpers:** `apps/medusa/src/shared/access-control.ts`, `access-control-context.ts`, `apps/medusa/src/api/acl-http.ts`.
- **Introspection & checks:** `GET` + `POST` `/admin/acl/roles` (both require `users.manage` via middleware).
- **User assignment API:** `GET` + `POST` `/admin/acl/user-roles` (`users.manage`).
- **Route guards:** `apps/medusa/src/api/middlewares.ts` (catalog, orders, analytics, users, settings, regions/sales-channels split read/write, API keys, etc.).
- **Secret API keys:** `apps/medusa/src/api/middlewares/api-key-acl.ts` — `api_keys.secrets` (`super_admin` only), publishable-only list behavior + response filter for others.
- **Admin UI:** `apps/medusa/src/admin/routes/acl-user-roles/page.tsx` — **ACL Users** sidebar; lists users, edits role + store scope, shows permission preview and **current admin context** (via `GET /admin/acl/roles`).
- **Seeding:** `pnpm --filter medusa seed:acl-roles` (`apps/medusa/src/scripts/seed-acl-role-users.ts`).
- **Tests:** `apps/medusa/src/__tests__/shared/access-control.unit.spec.ts`; ACL + API key cases in `apps/medusa/integration-tests/http/health.spec.ts`.

## Where the roadmap is ahead or behind

- **Ahead:** Product depth (presets, specs, WhatsApp, tenant runtime, storefront theme) exceeds a one-line “phase” label; much of “later” work is already in production shape locally.
- **Phase 8:** Documented as **done (core)**; remaining ACL work is **optional** (more admin modules, audit logs), not a blocker for Phase 9.
- **Phase 11:** Local backend/storefront hardening is in a good stop state. The remaining HTTPS and firewall work is a deployment-side follow-through item to revisit only after the real server is deployed and started.
- **Phase 5 / Stripe:** Still **paused by decision** in local dev; not a measure of overall platform readiness.

## Current risks, deferrals, and caveats

- Local Stripe webhook / card-field behavior remains deferred until a server-hosted HTTPS environment.
- PayPal webhook validation still needs `PAYPAL_WEBHOOK_ID` plus a public HTTPS callback path before webhook processing can be proven end to end.
- Older DBs may still need `pnpm --filter medusa shipping:ensure-il` for Israel shipping parity.
- Medusa HTTP integration tests expect Postgres on host port **5433** (see `status.md`).
- Development secrets in `.env` are not production-grade, even though Medusa now rejects weak/predictable production JWT/cookie secrets at config load.
- The new analytics rate limiter is process-local; if the Medusa app is later scaled horizontally, the same policy should move to a shared counter store such as Redis.

## Recommended next steps

1. **Start Phase 12** as the next primary lane.
2. **Revisit Phase 11 deploy items later**: handle HTTPS, firewall exposure, and hosted PayPal webhook/public-HTTPS follow-through only after the real server is deployed and started.
3. **Optional Phase 8 expansion:** map remaining Medusa admin modules to permissions; add ACL audit logging if compliance needs it.
4. Keep **Phase 4.5** and **Phase 6** in “maintain / polish” mode unless new gaps appear.

## Bottom line

The repo has crossed into **controlled platform operations**: Phase 8 delivers real ACL enforcement, secret-key isolation, tests, and an operator-facing **ACL Users** screen. **Phase 9 is complete for the current scope**, **Phase 10 is closed out for the current local scope**, and **Phase 11 is stopped at the current local milestone** with backend rate limiting, Redis-backed shared analytics counters, Medusa auth-secret hardening, storefront cookie-boundary hardening, trusted-origin analytics guards, and trusted-origin server-action guards already in place. **Phase 12 is now the next primary lane**, while webhook/public-HTTPS proof remains a hosted follow-through item.
