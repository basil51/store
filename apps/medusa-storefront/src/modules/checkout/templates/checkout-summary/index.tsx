"use client"

import { useCurrency } from "@lib/context/currency-context"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import {
  type CheckoutStep,
  trackCheckoutBlockerShown,
  trackCheckoutStepChanged,
} from "@lib/util/analytics"
import type { StorefrontSettings } from "@lib/types/storefront-settings"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartTotals from "@modules/common/components/cart-totals"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

const CHECKOUT_STEP_SET = new Set<CheckoutStep>([
  "address",
  "delivery",
  "payment",
  "review",
])

const CheckoutSummary = ({
  cart,
  storeSettings,
}: {
  cart: any
  storeSettings: StorefrontSettings
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const { displayPrice } = useCurrency()
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const itemSubtotal = cart.item_subtotal ?? cart.subtotal ?? 0

  const rawActiveStep = searchParams.get("step")
  const previousStepRef = useRef<CheckoutStep | null>(null)
  const guardTrackingRef = useRef<string | null>(null)
  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0
  const activePaymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session: any) => session.status === "pending"
  )

  const hasAddressStep =
    !!cart?.shipping_address && !!cart?.billing_address && !!cart?.email
  const hasDeliveryStep = (cart?.shipping_methods?.length ?? 0) > 0
  const hasPaymentStep = paidByGiftcard || !!activePaymentSession

  const firstRequiredStep: CheckoutStep = !hasAddressStep
    ? "address"
    : !hasDeliveryStep
    ? "delivery"
    : !hasPaymentStep
    ? "payment"
    : "review"

  const requestedStep = CHECKOUT_STEP_SET.has(rawActiveStep as CheckoutStep)
    ? (rawActiveStep as CheckoutStep)
    : null

  const isStepAllowed = (step: CheckoutStep) => {
    if (step === "address") {
      return true
    }

    if (step === "delivery") {
      return hasAddressStep
    }

    if (step === "payment") {
      return hasAddressStep && hasDeliveryStep
    }

    return hasAddressStep && hasDeliveryStep && hasPaymentStep
  }

  const shouldGuardRedirect =
    !requestedStep || !isStepAllowed(requestedStep)

  const activeStep = shouldGuardRedirect ? firstRequiredStep : requestedStep
  const nextStep = firstRequiredStep

  const stepLabels: Record<CheckoutStep, string> = {
    address: "Address",
    delivery: "Delivery",
    payment: "Payment",
    review: "Review",
  }

  const steps = [
    { key: "address", label: "Address", complete: hasAddressStep },
    { key: "delivery", label: "Delivery", complete: hasDeliveryStep },
    { key: "payment", label: "Payment", complete: hasPaymentStep },
    {
      key: "review",
      label: "Review",
      complete: hasAddressStep && hasDeliveryStep && hasPaymentStep,
    },
  ]

  const goToNextStep = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("step", nextStep)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (!shouldGuardRedirect) {
      guardTrackingRef.current = null
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("step", firstRequiredStep)

    if (requestedStep) {
      const trackingKey = `${requestedStep}->${firstRequiredStep}`

      if (guardTrackingRef.current !== trackingKey) {
        trackCheckoutBlockerShown({
          step: requestedStep,
          blocker_code: "incomplete_checkout_requirements",
        })

        guardTrackingRef.current = trackingKey
      }
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [
    firstRequiredStep,
    pathname,
    requestedStep,
    router,
    searchParams,
    shouldGuardRedirect,
  ])

  useEffect(() => {
    if (shouldGuardRedirect) {
      return
    }

    trackCheckoutStepChanged({
      step: activeStep,
      previous_step: previousStepRef.current ?? undefined,
    })

    previousStepRef.current = activeStep
  }, [activeStep, shouldGuardRedirect])

  const freeShippingThreshold = storeSettings.freeShippingThreshold
  const showFreeShippingProgress =
    typeof freeShippingThreshold === "number" && freeShippingThreshold > 0
  const freeShippingRemaining = showFreeShippingProgress
    ? Math.max(freeShippingThreshold - itemSubtotal, 0)
    : 0
  const freeShippingReached =
    showFreeShippingProgress && freeShippingRemaining === 0
  const freeShippingProgress = showFreeShippingProgress
    ? Math.min(itemSubtotal / freeShippingThreshold, 1)
    : 0

  return (
    <div className="sticky top-4 flex flex-col gap-y-6">
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2
          className="font-syne text-xl font-black mb-4"
          style={{ color: "var(--text)" }}
        >
          Order Summary
        </h2>

        <div
          className="mb-4 rounded-2xl p-4"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          data-testid="checkout-progress"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Checkout progress
            </p>
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
              style={{
                color: "var(--teal)",
                background: "rgba(0, 229, 200, 0.12)",
              }}
            >
              Step {Math.max(steps.findIndex((step) => step.key === activeStep) + 1, 1)} / 4
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {steps.map((step, index) => {
              const isActive = step.key === activeStep
              return (
                <div key={step.key} className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{
                      color: isActive ? "var(--text)" : "var(--text-dim)",
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {index + 1}. {step.label}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
                    style={{
                      color: step.complete ? "var(--teal)" : "var(--text-dim)",
                      background: step.complete
                        ? "rgba(0, 229, 200, 0.12)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${
                        step.complete
                          ? "rgba(0, 229, 200, 0.35)"
                          : "var(--border)"
                      }`,
                    }}
                  >
                    {step.complete ? "Complete" : isActive ? "Current" : "Pending"}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>
            {nextStep === "review"
              ? "All prerequisites are ready. Review and place your order when ready."
              : `Next required step: ${stepLabels[nextStep]}.`}
          </p>

          {activeStep !== nextStep ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(0, 229, 200, 0.14)",
                color: "var(--teal)",
                border: "1px solid rgba(0, 229, 200, 0.45)",
              }}
            >
              Continue to {stepLabels[nextStep]} →
            </button>
          ) : null}
        </div>

        {showFreeShippingProgress && (
          <div
            className="mb-4 rounded-2xl p-4"
            style={{
              background: freeShippingReached
                ? "rgba(0, 229, 200, 0.08)"
                : "var(--surface2)",
              border: `1px solid ${
                freeShippingReached ? "var(--teal)" : "var(--border)"
              }`,
            }}
            data-testid="checkout-free-shipping-progress"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--text)" }}
                >
                  {freeShippingReached
                    ? t("freeShippingProgressUnlocked")
                    : t("freeShippingProgressRemaining", {
                        amount: displayPrice(freeShippingRemaining),
                      })}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("freeShippingProgressThreshold", {
                    amount: displayPrice(freeShippingThreshold),
                  })}
                </p>
              </div>
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: freeShippingReached ? "var(--teal)" : "var(--text-dim)" }}
              >
                {freeShippingReached
                  ? t("freeShippingProgressEligible")
                  : `${Math.round(freeShippingProgress * 100)}%`}
              </span>
            </div>

            <div
              className="mt-3 h-2 overflow-hidden rounded-full"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${freeShippingProgress * 100}%`,
                  background: freeShippingReached ? "var(--teal)" : "var(--coral)",
                }}
              />
            </div>

            {!freeShippingReached ? (
              <LocalizedClientLink
                href="/store"
                className="mt-3 inline-flex text-xs font-semibold"
                style={{ color: "var(--teal)" }}
                data-testid="checkout-free-shipping-continue-shopping-link"
              >
                {t("freeShippingProgressContinueShopping")}
              </LocalizedClientLink>
            ) : null}
          </div>
        )}
        <div style={{ borderTop: "1px solid var(--border)" }} className="pt-4">
          <CartTotals totals={cart} />
        </div>
        <ItemsPreviewTemplate cart={cart} grouped={true} />
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <DiscountCode cart={cart} />
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
