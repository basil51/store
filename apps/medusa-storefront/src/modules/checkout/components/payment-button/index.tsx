"use client"

import { isManual, isStripeLike } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import {
  trackCheckoutPlaceOrderAttempt,
  trackCheckoutPlaceOrderFail,
} from "@lib/util/analytics"
import { HttpTypes } from "@medusajs/types"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const isNextRedirectSignal = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { message?: unknown; digest?: unknown }

  if (typeof candidate.digest === "string" && candidate.digest.startsWith("NEXT_REDIRECT")) {
    return true
  }

  return candidate.message === "NEXT_REDIRECT"
}

const DisabledHint = ({
  text,
  testId,
}: {
  text: string
  testId: string
}) => {
  return (
    <p
      className="mt-2 text-xs"
      style={{ color: "var(--text-dim)" }}
      data-testid={testId}
    >
      {text}
    </p>
  )
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.status === "pending"
  )

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton
          cart={cart}
          providerId={paymentSession?.provider_id}
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return (
        <div className="flex flex-col">
          <button className="btn-primary" disabled>
            Select a payment method
          </button>
          <DisabledHint
            text="Return to Payment and choose a payment method before placing your order."
            testId="place-order-disabled-reason"
          />
        </div>
      )
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        if (isNextRedirectSignal(err)) {
          return
        }

        const message = err?.message ?? "Unable to place order"
        setErrorMessage(message)
        trackCheckoutPlaceOrderFail({
          payment_provider_id: session?.provider_id,
          blocker_code: "place_order_error",
          reason_message: message,
        })
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const disabled = !stripe || !elements || !session?.data?.client_secret
  const disabledReason = submitting
    ? "Submitting your secure order..."
    : notReady
    ? "Complete address and delivery details before placing your order."
    : !session?.data?.client_secret
    ? "Preparing secure payment session..."
    : !stripe || !elements
    ? "Loading secure card form..."
    : null

  const handlePayment = async () => {
    setSubmitting(true)

    trackCheckoutPlaceOrderAttempt({
      payment_provider_id: session?.provider_id,
      currency_code: cart.currency_code,
      total: typeof cart.total === "number" ? cart.total : undefined,
    })

    if (!stripe || !elements || !card || !cart) {
      trackCheckoutPlaceOrderFail({
        payment_provider_id: session?.provider_id,
        blocker_code: "payment_form_not_ready",
      })
      setSubmitting(false)
      return
    }

    const countryCode =
      cart.shipping_address?.country_code?.toLowerCase() ||
      cart.billing_address?.country_code?.toLowerCase() ||
      "il"
    const returnUrl = `${window.location.origin}/${countryCode}/checkout?step=review`

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        return_url: returnUrl,
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address?.first_name +
              " " +
              cart.billing_address?.last_name,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          trackCheckoutPlaceOrderFail({
            payment_provider_id: session?.provider_id,
            blocker_code: "payment_confirmation_error",
            reason_message: error.message,
          })

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <button
        className="btn-primary"
        disabled={disabled || notReady || submitting}
        onClick={handlePayment}
        data-testid={dataTestId}
      >
        {submitting ? "Placing secure order..." : "Place secure order"}
      </button>
      {disabledReason ? (
        <DisabledHint
          text={disabledReason}
          testId="stripe-place-order-disabled-reason"
        />
      ) : null}
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const ManualTestPaymentButton = ({
  cart,
  providerId,
  notReady,
}: {
  cart: HttpTypes.StoreCart
  providerId?: string
  notReady: boolean
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const disabledReason = submitting
    ? "Submitting your secure order..."
    : notReady
    ? "Complete address and delivery details before placing your order."
    : null

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        if (isNextRedirectSignal(err)) {
          return
        }

        const message = err?.message ?? "Unable to place order"
        setErrorMessage(message)
        trackCheckoutPlaceOrderFail({
          payment_provider_id: providerId,
          blocker_code: "place_order_error",
          reason_message: message,
        })
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handlePayment = () => {
    setSubmitting(true)

    trackCheckoutPlaceOrderAttempt({
      payment_provider_id: providerId,
      currency_code: cart.currency_code,
      total: typeof cart.total === "number" ? cart.total : undefined,
    })

    onPaymentCompleted()
  }

  return (
    <>
      <button
        className="btn-primary"
        disabled={notReady || submitting}
        onClick={handlePayment}
        data-testid="submit-order-button"
      >
        {submitting ? "Placing secure order..." : "Place secure order"}
      </button>
      {disabledReason ? (
        <DisabledHint
          text={disabledReason}
          testId="manual-place-order-disabled-reason"
        />
      ) : null}
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
