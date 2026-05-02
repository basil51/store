# PayPal Sandbox Verification

Last updated: **2026-05-02**

This runbook covers the current local Phase 10 PayPal verification path.

## Current local state

- Backend PayPal provider is implemented in `apps/medusa/src/modules/paypal`.
- Storefront PayPal checkout path is wired in `apps/medusa-storefront`.
- Region enablement is handled by `pnpm --filter medusa run paypal:sync-provider`.
- Local payment-session creation is now script-verified by `pnpm --filter medusa run paypal:verify-session`.

## Prerequisites

- Docker services are up: `docker compose up -d`
- Medusa backend is running on `http://localhost:9244`
- Storefront is running on `http://localhost:8000`
- `apps/medusa/.env` contains:
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENVIRONMENT=sandbox`
  - optional later: `PAYPAL_WEBHOOK_ID`
- `apps/medusa-storefront/.env.local` contains:
  - `NEXT_PUBLIC_PAYPAL_CLIENT_ID`

## Step 1: Verify payment-session creation

Run:

```bash
cd /home/basel/Projects/Store
pnpm --filter medusa run paypal:verify-session
```

Expected result:

- A real cart is created.
- A shipping method is attached.
- A PayPal payment session is initialized.
- The script prints:
  - cart id
  - payment collection id
  - PayPal order id
  - PayPal intent
  - PayPal approval URL

If this step fails, do not continue to storefront testing. Fix backend env, region enablement, or Store API readiness first.

## Step 2: Verify storefront selection path

Open the storefront checkout and confirm:

1. PayPal appears as a payment method.
2. Selecting PayPal allows moving from Payment to Review.
3. The Review step renders the PayPal button.

This proves the storefront is reading the PayPal provider and using the SDK wrapper correctly.

## Step 3: Verify sandbox approval path

Use one of these two paths:

### Option A: Script-first

1. Run `pnpm --filter medusa run paypal:verify-session`.
2. Copy the printed `Approval URL`.
3. Open it in a browser.
4. Log in with a PayPal sandbox personal buyer account.
5. Approve the payment.

### Option B: Storefront-first

1. Go through storefront checkout.
2. Select PayPal.
3. Continue to Review.
4. Click the PayPal button and approve the sandbox payment.

## Step 4: Verify order completion

After approval, confirm:

1. The storefront returns to the order confirmation flow.
2. A Medusa order is created.
3. The order payment record is tied to the PayPal provider.

Current expectation in this repo:

- local PayPal session creation is proven
- local manual sandbox approval still needs explicit operator verification
- webhook-backed verification remains a separate step

## Step 5: Verify webhook flow later

Webhook verification is not complete until all of these are true:

1. `PAYPAL_WEBHOOK_ID` is set in `apps/medusa/.env`
2. Medusa is reachable on public HTTPS
3. PayPal Developer Dashboard webhook points to:

```text
https://<public-host>/hooks/payment/paypal_paypal
```

4. The backend logs show successful webhook delivery after sandbox payment events

Recommended events:

- `PAYMENT.AUTHORIZATION.CREATED`
- `PAYMENT.AUTHORIZATION.VOIDED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`

## Useful commands

```bash
cd /home/basel/Projects/Store
docker compose up -d
pnpm dev:medusa
pnpm dev:storefront
pnpm --filter medusa run paypal:sync-provider
pnpm --filter medusa run paypal:verify-session
```

## What is already verified vs still open

Verified locally:

- backend PayPal provider wiring
- storefront PayPal checkout path wiring
- region enablement
- PayPal payment-session creation with real Store API calls

Still open:

- explicit sandbox approval and return proof
- order-completion evidence after PayPal approval
- browser/integration automation for the PayPal happy path
- public HTTPS webhook proof with `PAYPAL_WEBHOOK_ID`