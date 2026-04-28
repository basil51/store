# Medusa Storefront App

This package is the customer-facing storefront for the Store platform monorepo.
It is built with Next.js and integrates with the Medusa backend in `apps/medusa`.

For full project context, architecture, and roadmap status, see the root README:

- [../../README.md](../../README.md)

## Scope of This App

- Product browsing, category navigation, and PDP flows.
- Cart and checkout journey.
- Account and order surfaces.
- Locale-aware UI with EN/AR/HE support and RTL/LTR behavior.
- WhatsApp-assisted ordering experiences and related analytics hooks.

## Run the Storefront

From the repository root:

```bash
pnpm dev:storefront
```

Storefront local URL (default):

- `http://localhost:8000`

## Workspace Commands

From the repository root, common storefront-focused commands include:

```bash
pnpm test:storefront:unit
pnpm test:e2e:checkout
pnpm test:e2e:checkout-matrix
pnpm test:e2e:checkout-happy-path
pnpm test:e2e:whatsapp
pnpm test:e2e:whatsapp-storefront
```

## Notes

- This README intentionally avoids generic Medusa starter-template documentation.
- Keep project-wide setup and product roadmap details in the root `README.md`, `roadmap.md`, and `status.md`.
