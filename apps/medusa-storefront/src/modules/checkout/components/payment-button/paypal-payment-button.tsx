"use client"

import { placeOrder } from "@lib/data/cart"
import {
  type CheckoutBlockerCode,
  trackCheckoutPlaceOrderAttempt,
  trackCheckoutPlaceOrderFail,
} from "@lib/util/analytics"
import { HttpTypes } from "@medusajs/types"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

type PayPalPaymentButtonProps = {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}

const isNextRedirectSignal = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { message?: unknown; digest?: unknown }

  if (
    typeof candidate.digest === "string" &&
    candidate.digest.startsWith("NEXT_REDIRECT")
  ) {
    return true
  }

  return candidate.message === "NEXT_REDIRECT"
}

const PayPalPaymentButton: React.FC<PayPalPaymentButtonProps> = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer()

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.status === "pending"
  )

  const providerId = paymentSession?.provider_id
  const sessionData = paymentSession?.data as Record<string, unknown> | undefined

  const reportFailure = (message: string, blockerCode: CheckoutBlockerCode) => {
    trackCheckoutPlaceOrderFail({
      payment_provider_id: providerId,
      blocker_code: blockerCode,
      reason_message: message,
    })
  }

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((error) => {
        if (isNextRedirectSignal(error)) {
          return
        }

        const message =
          error instanceof Error ? error.message : "Unable to place order"
        setErrorMessage(message)
        reportFailure(message, "place_order_error")
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const getPayPalOrderId = () => {
    const candidate =
      sessionData?.order_id ?? sessionData?.orderId ?? sessionData?.id

    return typeof candidate === "string" ? candidate : null
  }

  const createOrder = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    trackCheckoutPlaceOrderAttempt({
      payment_provider_id: providerId,
      currency_code: cart.currency_code,
      total: typeof cart.total === "number" ? cart.total : undefined,
    })

    const existingOrderId = getPayPalOrderId()

    if (existingOrderId) {
      return existingOrderId
    }

    const message =
      "PayPal order not found. Re-select PayPal to create a fresh payment session."
    setErrorMessage(message)
    reportFailure(message, "payment_form_not_ready")
    setSubmitting(false)
    throw new Error(message)
  }

  const handleApprove = async () => {
    try {
      setSubmitting(true)
      setErrorMessage(null)
      await onPaymentCompleted()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to process PayPal payment"
      setErrorMessage(message)
      reportFailure(message, "payment_confirmation_error")
      setSubmitting(false)
    }
  }

  const handleError = (error: Record<string, unknown>) => {
    const message =
      typeof error.message === "string"
        ? error.message
        : "An error occurred while loading PayPal"

    setErrorMessage(message)
    reportFailure(message, "payment_confirmation_error")
    setSubmitting(false)
  }

  const handleCancel = () => {
    setErrorMessage("PayPal payment was cancelled")
    setSubmitting(false)
  }

  const disabledReason = submitting
    ? "Confirming your PayPal payment..."
    : notReady
    ? "Complete address and delivery details before paying with PayPal."
    : !paymentSession
    ? "Preparing PayPal session..."
    : isPending || !isResolved
    ? "Loading PayPal checkout..."
    : null

  if (isRejected) {
    return (
      <>
        <button className="btn-primary" disabled>
          PayPal unavailable
        </button>
        <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
          Unable to load the PayPal SDK. Check NEXT_PUBLIC_PAYPAL_CLIENT_ID.
        </p>
        <ErrorMessage
          error={errorMessage}
          data-testid="paypal-payment-error-message"
        />
      </>
    )
  }

  if (!isResolved) {
    return (
      <>
        <button className="btn-primary" disabled>
          Loading PayPal...
        </button>
        {disabledReason ? (
          <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
            {disabledReason}
          </p>
        ) : null}
        <ErrorMessage
          error={errorMessage}
          data-testid="paypal-payment-error-message"
        />
      </>
    )
  }

  return (
    <>
      <div className="min-h-[48px]" data-testid={dataTestId}>
        <PayPalButtons
          createOrder={createOrder}
          onApprove={handleApprove}
          onError={handleError}
          onCancel={handleCancel}
          disabled={notReady || submitting || !paymentSession}
          style={{
            layout: "horizontal",
            color: "black",
            shape: "rect",
            label: "paypal",
            height: 44,
          }}
        />
      </div>
      {disabledReason ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
          {disabledReason}
        </p>
      ) : null}
      <ErrorMessage
        error={errorMessage}
        data-testid="paypal-payment-error-message"
      />
    </>
  )
}

export default PayPalPaymentButton