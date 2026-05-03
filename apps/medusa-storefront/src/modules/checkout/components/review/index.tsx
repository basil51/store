"use client"

import { isManual, isPaypal, isStripeLike, getLocalizedPaymentMethodTitle } from "@lib/constants"
import {
  type CheckoutBlockerCode,
  trackCheckoutBlockerShown,
} from "@lib/util/analytics"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import PaymentButton from "../payment-button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

const StepStatus = ({
  label,
  complete,
  completeLabel,
  pendingLabel,
}: {
  label: string
  complete: boolean
  completeLabel: string
  pendingLabel: string
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
        {complete ? completeLabel : pendingLabel}
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
  locale,
}: {
  paidByGiftcard: boolean
  providerId?: string
  locale: string | null | undefined
}) => {
  if (paidByGiftcard) {
    return getUiCopy(locale, "checkoutEstimateInstantAfterPlacement")
  }

  if (!providerId) {
    return getUiCopy(locale, "checkoutEstimateFewMinutes")
  }

  if (isStripeLike(providerId)) {
    return getUiCopy(locale, "checkoutEstimateAfterCardAuthorization")
  }

  if (isPaypal(providerId)) {
    return getUiCopy(locale, "checkoutEstimateAfterProviderConfirmation")
  }

  if (isManual(providerId)) {
    return getUiCopy(locale, "checkoutEstimateOfflineFollowUp")
  }

  return getUiCopy(locale, "checkoutEstimateFewMinutes")
}

const Review = ({ cart }: { cart: any }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const isOpen = searchParams.get("step") === "review"
  const lastTrackedBlockerRef = useRef<CheckoutBlockerCode | null>(null)

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const activePaymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session: any) => session.status === "pending"
  )

  const paymentProviderId = activePaymentSession?.provider_id as string | undefined
  const isManualPayment = isManual(paymentProviderId)
  const paymentMethodLabel = paidByGiftcard
    ? t("checkoutGiftCard")
    : paymentProviderId
    ? getLocalizedPaymentMethodTitle(paymentProviderId, locale)
    : t("checkoutPending")

  const estimatedConfirmationTiming = getEstimatedConfirmationTiming({
    paidByGiftcard,
    providerId: paymentProviderId,
    locale,
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
      ? t("checkoutAddressDetails")
      : firstIncompleteStep === "delivery"
      ? t("checkoutDeliveryMethod")
      : firstIncompleteStep === "payment"
      ? t("checkoutPaymentMethod")
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
    { key: "address", label: t("checkoutStepAddress"), complete: hasAddressStep },
    { key: "delivery", label: t("checkoutStepDelivery"), complete: hasDeliveryStep },
    { key: "payment", label: t("checkoutStepPayment"), complete: hasPaymentStep },
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
        {t("checkoutReviewTitle")}
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
                  {t("checkoutPaymentSummaryStripTitle")}
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
                  {t("checkoutEstimatedConfirmation")}
                </span>
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  {estimatedConfirmationTiming}
                </span>
              </div>
            </div>

            {!hasPaymentStep ? (
              <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
                {t("checkoutCompletePaymentSetupEstimate")}
              </p>
            ) : null}
          </div>

          <div
            className="mb-6 rounded-xl p-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t("checkoutBeforePlacingOrder")}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <StepStatus label={t("checkoutAddressDetails")} complete={hasAddressStep} completeLabel={t("checkoutComplete")} pendingLabel={t("checkoutPending")} />
              <StepStatus label={t("checkoutDeliveryMethod")} complete={hasDeliveryStep} completeLabel={t("checkoutComplete")} pendingLabel={t("checkoutPending")} />
              <StepStatus label={t("checkoutPaymentMethod")} complete={hasPaymentStep} completeLabel={t("checkoutComplete")} pendingLabel={t("checkoutPending")} />
            </div>
          </div>

          <div
            className="mb-6 rounded-xl p-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            data-testid="review-edit-shortcuts"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
                {t("checkoutNeedToEditSomething")}
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
                {t("checkoutTermsAcknowledgement")}
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
                  {t("checkoutOrderAssuranceTitle")}
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <AssuranceItem
                    title={
                      isManualPayment
                        ? t("checkoutOfflinePaymentCollectionTitle")
                        : t("checkoutSecurePaymentProcessingTitle")
                    }
                    detail={
                      isManualPayment
                        ? t("checkoutOfflinePaymentCollectionDetail")
                        : t("checkoutSecurePaymentProcessingDetail")
                    }
                  />
                  <AssuranceItem
                    title={t("checkoutNoHiddenChargesTitle")}
                    detail={t("checkoutNoHiddenChargesDetail")}
                  />
                  <AssuranceItem
                    title={t("checkoutInstantConfirmationTitle")}
                    detail={t("checkoutInstantConfirmationDetail", {
                      email: cart?.email ?? "your email",
                    })}
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
                  {t("checkoutWhatHappensNextTitle")}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {isManualPayment
                      ? t("checkoutWhatNextManualStep1")
                      : t("checkoutWhatNextStandardStep1")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {t("checkoutWhatNextStep2")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {isManualPayment
                      ? t("checkoutWhatNextManualStep3", {
                          email: cart?.email ?? "your email",
                        })
                      : t("checkoutWhatNextStep3", {
                          email: cart?.email ?? "your email",
                        })}
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
                {t("checkoutCompleteSectionToContinue", { section: firstIncompleteLabel })}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                {t("checkoutOnceDoneReturnHere")}
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
                  {t("checkoutContinueToStep", { step: firstIncompleteLabel })}
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
