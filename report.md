# Project State Report

Date: **2026-05-02**  
Source of truth: `status.md`, `roadmap.md`, and the repo as of this report.

## Executive Summary

The platform is in **post–Phase-8** shape for access control: roles and permissions are defined in code, enforced on major Medusa admin route groups, secret admin API keys are locked down for non–`super_admin` users, and operators can assign **`acl_role`** / **`acl_store_ids`** from **Admin → ACL Users** instead of editing metadata by hand. Unit and HTTP integration tests cover ACL and API-key behavior.

**Phase 8 is treated as complete for the agreed core scope.** **Phase 9 (admin panel track) is complete for the current scope**: **9.1** store overview is done, **9.2** product management is covered by **Catalog hub** plus native Medusa product screens, and **9.3 / 9.4** are satisfied by Medusa Dashboard capabilities unless a custom requirement appears.

Long-standing caveats unchanged: **Phase 5 Stripe** remains intentionally paused locally, so **Phase 10 should be treated as payment completion from that local milestone rather than as a greenfield payments build**. PayPal is now complete for the current local scope: backend provider wiring, storefront checkout support, session verification, and browser coverage are in place, while hosted webhook/public-HTTPS follow-through remains deferred. The existing local manual payment flow still works today and is now the next local payment clarification item. **Phase 4.5** (RTL / locale copy) stays in light stabilization; **Phase 6** WhatsApp is substantial and can receive polish as needed.

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
| **Phase 10** | **Payments** | **Payment completion lane** — Stripe is mostly covered locally and deferred for hosted HTTPS follow-up; PayPal is complete for the current local scope, and the next payment work is manual-payment semantics clarification plus hosted webhook/public-HTTPS follow-through |
| Phases 11+ | Security, i18n at scale, performance, etc. | Pending or partially grounded by earlier work |

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
- **Phase 5 / Stripe:** Still **paused by decision** in local dev; not a measure of overall platform readiness.

## Current risks, deferrals, and caveats

- Local Stripe webhook / card-field behavior remains deferred until a server-hosted HTTPS environment.
- PayPal webhook validation still needs `PAYPAL_WEBHOOK_ID` plus a public HTTPS callback path before webhook processing can be proven end to end.
- Older DBs may still need `pnpm --filter medusa shipping:ensure-il` for Israel shipping parity.
- Medusa HTTP integration tests expect Postgres on host port **5433** (see `status.md`).
- Development secrets in `.env` are not production-grade.

## Recommended next steps

1. **Continue Phase 10** as payment completion from the current local milestone, not as a greenfield rebuild. Use `roadmap.md` §10.1–10.3 as the backlog anchor: prioritize **manual-payment semantics clarification** locally next, while leaving PayPal webhook/public-HTTPS follow-through and the deferred Stripe remount/webhook work for a hosted HTTPS environment.
2. **Optional Phase 8 expansion:** map remaining Medusa admin modules to permissions; add ACL audit logging if compliance needs it.
3. Keep **Phase 4.5** and **Phase 6** in “maintain / polish” mode unless new gaps appear.
4. Revisit **Stripe** only when deployment environment supports finishing it cleanly.

## Bottom line

The repo has crossed into **controlled platform operations**: Phase 8 delivers real ACL enforcement, secret-key isolation, tests, and an operator-facing **ACL Users** screen. **Phase 9 is complete for the current scope**, and **Phase 10 is now in closeout mode rather than initial implementation mode**: PayPal is complete for the current local scope, while webhook/public-HTTPS proof remains the hosted follow-through and manual-payment semantics are the next local checkout clarification.
