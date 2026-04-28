# Store Platform Monorepo

This repository contains a multipurpose e-commerce platform built on Medusa and Next.js.
It is designed as a scalable foundation for multilingual, multi-tenant commerce with advanced product configuration and WhatsApp-assisted ordering.

## Project Goals

- Build a modern storefront and admin-backed commerce platform, not just a single shop.
- Support complex catalog structures (deep categories, variant combinations, rich specifications).
- Enable multiple ordering paths (standard checkout and WhatsApp click-to-order).
- Prepare for future multi-store SaaS evolution.

## Tech Stack

- Backend: Medusa v2 (`apps/medusa`)
- Storefront: Next.js 15 (`apps/medusa-storefront`)
- Database: PostgreSQL
- Cache: Redis
- Object storage: MinIO (S3-compatible)
- Package manager/workspace: pnpm

## Repository Layout

- `apps/medusa`: Commerce backend, admin extensions, scripts, workflows, and APIs.
- `apps/medusa-storefront`: Next.js storefront experience and e2e tests.
- `roadmap.md`: High-level product and engineering roadmap.
- `status.md`: Living implementation details and progress notes.

## Current Delivery Status

Based on the roadmap:

- Foundation and core data architecture are complete.
- Advanced product configuration work is complete for the current scope.
- Frontend redesign scope is completed.
- Cart and checkout reached a local milestone; deferred follow-ups are intentionally paused.
- WhatsApp integration is actively in progress with analytics and e2e coverage already in place.

## Key Product Capabilities

- Multilingual UX (EN/AR/HE) with RTL/LTR support.
- Variant-aware product experiences and preset combinations.
- Stock-mode aware behavior across listing, PDP, and cart flows.
- Checkout improvements and analytics instrumentation.
- WhatsApp message templating, preview flow, and funnel analytics.
- Tenant provisioning, translation tooling, and operational scripts.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for local PostgreSQL/Redis/MinIO stack)

### Install Dependencies

```bash
pnpm install
```

### Run Backend and Storefront

In separate terminals:

```bash
pnpm dev:medusa
```

```bash
pnpm dev:storefront
```

### Useful Root Scripts

```bash
pnpm db:migrate
pnpm seed:locales
pnpm test:storefront:unit
pnpm test:e2e:checkout
pnpm test:e2e:whatsapp
```

## Notes

- The storefront app includes its own starter-oriented README at `apps/medusa-storefront/README.md`.
- For roadmap and implementation tracking, use `roadmap.md` and `status.md` as the source of truth.
