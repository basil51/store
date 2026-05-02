"use client"

import { isManual, isPaypal, isStripeLike, paymentInfoMap } from "@lib/constants"
import {
  type CheckoutBlockerCode,
  trackCheckoutBlockerShown,
} from "@lib/util/analytics"
import PaymentButton from "../payment-button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

const StepStatus = ({
  label,
  complete,
}: {
  label: string
  complete: boolean
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text)" }}>
        {label}
      </span>
      <span
        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
        style={{
          color: complete ? "var(--teal)" : "var(--text-dim)",
          background: complete ? "rgba(0, 229, 200, 0.12)" : "var(--surface2)",
          border: `1px solid ${complete ? "rgba(0, 229, 200, 0.35)" : "var(--border)"}`,
        }}
      >
        {complete ? "Complete" : "Pending"}
      </span>
    </div>
  )
}

const AssuranceItem = ({
  title,
  detail,
}: {
  title: string
  detail: string
}) => {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-[2px] h-2 w-2 rounded-full"
        style={{ background: "var(--teal)" }}
      />
      <div>
        <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-dim)" }}>
          {detail}
        </p>
      </div>
    </div>
  )
}

const getEstimatedConfirmationTiming = ({
  paidByGiftcard,
  providerId,
}: {
  paidByGiftcard: boolean
  providerId?: string
}) => {
  if (paidByGiftcard) {
    return "Usually instant after order placement"
  }

  if (!providerId) {
    return "Usually within a few minutes"
  }

  if (isStripeLike(providerId)) {
    return "Usually instant after card authorization"
  }

  if (isPaypal(providerId)) {
    return "Usually instant after provider confirmation"
  }

  if (isManual(providerId)) {
    return "Confirmed first, then collected offline in this environment"
  }

  return "Usually within a few minutes"
}

const Review = ({ cart }: { cart: any }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "review"
  const lastTrackedBlockerRef = useRef<CheckoutBlockerCode | null>(null)

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const activePaymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session: any) => session.status === "pending"
  )

  const paymentProviderId = activePaymentSession?.provider_id as string | undefined
  const paymentMethodLabel = paidByGiftcard
    ? "Gift card"
    : paymentProviderId
    ? paymentInfoMap[paymentProviderId]?.title ?? paymentProviderId
    : "Not selected yet"

  const estimatedConfirmationTiming = getEstimatedConfirmationTiming({
    paidByGiftcard,
    providerId: paymentProviderId,
  })

  const hasAddressStep =
    !!cart?.shipping_address && !!cart?.billing_address && !!cart?.email
  const hasDeliveryStep = (cart?.shipping_methods?.length ?? 0) > 0
  const hasPaymentStep = paidByGiftcard || !!activePaymentSession

  const previousStepsCompleted =
    hasAddressStep && hasDeliveryStep && hasPaymentStep

  const firstIncompleteStep = !hasAddressStep
    ? "address"
    : !hasDeliveryStep
    ? "delivery"
    : !hasPaymentStep
    ? "payment"
    : null

  const firstIncompleteLabel =
    firstIncompleteStep === "address"
      ? "address details"
      : firstIncompleteStep === "delivery"
      ? "delivery method"
      : firstIncompleteStep === "payment"
      ? "payment method"
      : ""

  const reviewBlockerCode: CheckoutBlockerCode | null =
    firstIncompleteStep === "address"
      ? "missing_address_details"
      : firstIncompleteStep === "delivery"
      ? "missing_delivery_method"
      : firstIncompleteStep === "payment"
      ? "missing_payment_method"
      : null

  const navigateToStep = (step: "address" | "delivery" | "payment") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("step", step)

    router.push(`${pathname}?${params.toString()}`, {
      scroll: false,
    })
  }

  const stepShortcuts: Array<{
    key: "address" | "delivery" | "payment"
    label: string
    complete: boolean
  }> = [
    { key: "address", label: "Address", complete: hasAddressStep },
    { key: "delivery", label: "Delivery", complete: hasDeliveryStep },
    { key: "payment", label: "Payment", complete: hasPaymentStep },
  ]

  const goToIncompleteStep = () => {
    if (!firstIncompleteStep) {
      return
    }

    navigateToStep(firstIncompleteStep)
  }

  useEffect(() => {
    if (!isOpen) {
      lastTrackedBlockerRef.current = null
      return
    }

    if (previousStepsCompleted || !reviewBlockerCode) {
      return
    }

    if (lastTrackedBlockerRef.current === reviewBlockerCode) {
      return
    }

    trackCheckoutBlockerShown({
      step: "review",
      blocker_code: reviewBlockerCode,
    })

    lastTrackedBlockerRef.current = reviewBlockerCode
  }, [isOpen, previousStepsCompleted, reviewBlockerCode])

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: !isOpen ? 0.5 : 1,
        pointerEvents: !isOpen ? "none" : undefined,
      }}
    >
      <h2
        className="font-syne text-xl font-black mb-6"
        style={{ color: "var(--text)" }}
      >
        Review
      </h2>
      {isOpen && (
        <>
          <div
            className="mb-4 rounded-xl p-4"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
            }}
            data-testid="review-payment-summary-strip"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex flex-col">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-dim)" }}
                >
                  Payment summary
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {paymentMethodLabel}
                </span>
              </div>

              <div className="flex flex-col [text-align:start] small:[text-align:end]">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-dim)" }}
                >
                  Estimated confirmation
                </span>
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  {estimatedConfirmationTiming}
                </span>
              </div>
            </div>

            {!hasPaymentStep ? (
              <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
                Complete payment setup to lock this estimate before placing your order.
              </p>
            ) : null}
          </div>

          <div
            className="mb-6 rounded-xl p-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Before placing your order
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <StepStatus label="Address details" complete={hasAddressStep} />
              <StepStatus label="Delivery method" complete={hasDeliveryStep} />
              <StepStatus label="Payment method" complete={hasPaymentStep} />
            </div>
          </div>

          <div
            className="mb-6 rounded-xl p-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            data-testid="review-edit-shortcuts"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
                Need to edit something?
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {stepShortcuts.map((step) => (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => navigateToStep(step.key)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      color: step.complete ? "var(--teal)" : "var(--text-dim)",
                      background: step.complete
                        ? "rgba(0, 229, 200, 0.12)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${
                        step.complete ? "rgba(0, 229, 200, 0.35)" : "var(--border)"
                      }`,
                    }}
                    aria-label={`Edit ${step.label.toLowerCase()}`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {previousStepsCompleted ? (
            <>
              <p
                className="text-sm mb-6 leading-relaxed"
                style={{ color: "var(--text-dim)" }}
              >
                By clicking the Place Order button, you confirm that you have read,
                understand and accept our Terms of Use, Terms of Sale and Returns
                Policy and acknowledge that you have read our Privacy Policy.
              </p>

              <div
                className="mb-4 rounded-xl p-4"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                }}
                data-testid="review-assurance"
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Order assurance
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <AssuranceItem
                    title="Secure payment processing"
                    detail="Your payment details are handled by the selected payment provider."
                  />
                  <AssuranceItem
                    title="No hidden checkout charges"
                    detail="Your current totals in the summary are the charges used at order placement."
                  />
                  <AssuranceItem
                    title="Instant confirmation"
                    detail={`A confirmation will be sent to ${cart?.email ?? "your email"} after successful placement.`}
                  />
                </div>
              </div>

              <div
                className="mb-4 rounded-xl p-4"
                style={{
                  background: "rgba(0, 229, 200, 0.08)",
                  border: "1px solid rgba(0, 229, 200, 0.3)",
                }}
                data-testid="review-micro-commitment"
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  What happens next
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    1. We place your order securely with the selected payment method.
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    2. You are taken to the order confirmation page right away.
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    3. We send your confirmation details to {cart?.email ?? "your email"}.
                  </p>
                </div>
              </div>

              <PaymentButton cart={cart} data-testid="submit-order-button" />
            </>
          ) : (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(255, 159, 10, 0.08)",
                border: "1px solid rgba(255, 159, 10, 0.35)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Complete {firstIncompleteLabel} to continue
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                Once this is done, return here to place your order.
              </p>
              {firstIncompleteStep ? (
                <button
                  type="button"
                  onClick={goToIncompleteStep}
                  className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    color: "#7c2d12",
                    background: "rgba(255, 159, 10, 0.18)",
                    border: "1px solid rgba(255, 159, 10, 0.4)",
                  }}
                >
                  Continue to {firstIncompleteLabel}
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Review
