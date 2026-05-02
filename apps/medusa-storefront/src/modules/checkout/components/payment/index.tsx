"use client"

import { RadioGroup } from "@headlessui/react"
import { isManual, isPaypal, isStripeLike, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import {
  type CheckoutBlockerCode,
  trackCheckoutBlockerShown,
} from "@lib/util/analytics"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripeCardContainer,
} from "@modules/checkout/components/payment-container"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const isStalePaymentSessionError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const message =
    typeof (error as { message?: unknown }).message === "string"
      ? ((error as { message: string }).message ?? "")
      : ""

  return /paymentsession/i.test(message) && /not found/i.test(message)
}

const getStoredPaymentMethod = (cartId?: string) => {
  if (typeof window === "undefined" || !cartId) {
    return null
  }

  try {
    return window.sessionStorage.getItem(
      `checkout:selected-payment-method:${cartId}`
    )
  } catch {
    return null
  }
}

const setStoredPaymentMethod = (cartId: string | undefined, method: string | null) => {
  if (typeof window === "undefined" || !cartId) {
    return
  }

  try {
    const storageKey = `checkout:selected-payment-method:${cartId}`

    if (method) {
      window.sessionStorage.setItem(storageKey, method)
      return
    }

    window.sessionStorage.removeItem(storageKey)
  } catch {
    // Ignore storage failures and fall back to in-memory selection.
  }
}

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )
  const cartId = cart?.id

  const getPreferredPaymentMethod = useCallback(() => {
    if (activeSession?.provider_id) {
      return activeSession.provider_id
    }

    const stripeMethod = availablePaymentMethods.find((method) =>
      isStripeLike(method.id)
    )

    return stripeMethod?.id ?? availablePaymentMethods[0]?.id ?? ""
  }, [activeSession?.provider_id, availablePaymentMethods])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    getPreferredPaymentMethod
  )
  const autoInitiatedPaymentMethodRef = useRef<string | null>(null)
  const lastTrackedBlockerRef = useRef<CheckoutBlockerCode | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const initializePaymentSessionWithRecovery = useCallback(
    async (providerId: string) => {
      const initializeSession = () =>
        initiatePaymentSession(cart, {
          provider_id: providerId,
        })

      try {
        await initializeSession()
        return
      } catch (err) {
        if (!isStalePaymentSessionError(err)) {
          throw err
        }

        await initializeSession()
      }
    },
    [cart]
  )

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setStoredPaymentMethod(cartId, method)
    setSelectedPaymentMethod(method)
    if (isStripeLike(method) || isPaypal(method)) {
      try {
        await initializePaymentSessionWithRecovery(method)
        router.refresh()
      } catch (err: any) {
        setError(err?.message ?? "Unable to prepare payment method. Please try again.")
      }
    }
  }

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const hasShippingMethod = (cart?.shipping_methods?.length ?? 0) > 0
  const requiresCardDetails = isStripeLike(selectedPaymentMethod)
  const hasSelectedPaymentMethod = !!selectedPaymentMethod || paidByGiftcard
  const canContinueToReview =
    paidByGiftcard ||
    (hasShippingMethod &&
      !!selectedPaymentMethod &&
      (!requiresCardDetails || cardComplete))

  const paymentReady =
    (activeSession && hasShippingMethod) || paidByGiftcard

  const readinessBlockerCode: CheckoutBlockerCode | null = !hasShippingMethod
    ? "missing_delivery_method"
    : !hasSelectedPaymentMethod
    ? "missing_payment_method"
    : requiresCardDetails && !cardComplete
    ? "incomplete_card_details"
    : null

  const readinessMessage = !hasShippingMethod
    ? "Select a delivery method before continuing."
    : !hasSelectedPaymentMethod
    ? "Choose a payment method to continue."
    : requiresCardDetails && !cardComplete
    ? "Enter complete card details to continue to review."
    : null

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleGoToDelivery = () => {
    router.push(pathname + "?" + createQueryString("step", "delivery"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    if (!canContinueToReview) {
      return
    }

    setIsLoading(true)
    try {
      const shouldInputCard =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        await initializePaymentSessionWithRecovery(selectedPaymentMethod)
      }

      if (!shouldInputCard) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  useEffect(() => {
    let cancelled = false

    if (!isOpen || paidByGiftcard) {
      return () => {
        cancelled = true
      }
    }

    if (!(isStripeLike(selectedPaymentMethod) || isPaypal(selectedPaymentMethod))) {
      autoInitiatedPaymentMethodRef.current = null
      return () => {
        cancelled = true
      }
    }

    if (!cart?.shipping_methods?.length) {
      return () => {
        cancelled = true
      }
    }

    if (activeSession?.provider_id === selectedPaymentMethod) {
      autoInitiatedPaymentMethodRef.current = selectedPaymentMethod
      return () => {
        cancelled = true
      }
    }

    if (autoInitiatedPaymentMethodRef.current === selectedPaymentMethod) {
      return () => {
        cancelled = true
      }
    }

    autoInitiatedPaymentMethodRef.current = selectedPaymentMethod

    void initializePaymentSessionWithRecovery(selectedPaymentMethod)
      .then(() => {
        if (cancelled) {
          return
        }

        router.refresh()
      })
      .catch((err: any) => {
        if (cancelled) {
          return
        }

        autoInitiatedPaymentMethodRef.current = null
        setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [
    activeSession?.provider_id,
    cart,
    isOpen,
    paidByGiftcard,
    router,
    selectedPaymentMethod,
    initializePaymentSessionWithRecovery,
  ])

  useEffect(() => {
    const storedPaymentMethod = getStoredPaymentMethod(cartId)

    if (!storedPaymentMethod) {
      return
    }

    const storedMethodStillAvailable = availablePaymentMethods.some(
      (method) => method.id === storedPaymentMethod
    )

    if (!storedMethodStillAvailable) {
      setStoredPaymentMethod(cartId, null)
      return
    }

    if (selectedPaymentMethod === storedPaymentMethod) {
      return
    }

    setSelectedPaymentMethod(storedPaymentMethod)
  }, [availablePaymentMethods, cartId, selectedPaymentMethod])

  useEffect(() => {
    const preferredPaymentMethod = getPreferredPaymentMethod()

    if (!preferredPaymentMethod) {
      return
    }

    const currentMethodStillAvailable = availablePaymentMethods.some(
      (method) => method.id === selectedPaymentMethod
    )

    if (
      selectedPaymentMethod === preferredPaymentMethod ||
      currentMethodStillAvailable
    ) {
      return
    }

    setSelectedPaymentMethod(preferredPaymentMethod)
  }, [
    availablePaymentMethods,
    getPreferredPaymentMethod,
    selectedPaymentMethod,
  ])

  useEffect(() => {
    if (!isOpen) {
      lastTrackedBlockerRef.current = null
      return
    }

    if (!readinessBlockerCode) {
      return
    }

    if (lastTrackedBlockerRef.current === readinessBlockerCode) {
      return
    }

    trackCheckoutBlockerShown({
      step: "payment",
      blocker_code: readinessBlockerCode,
      payment_provider_id: selectedPaymentMethod || undefined,
    })

    lastTrackedBlockerRef.current = readinessBlockerCode
  }, [isOpen, readinessBlockerCode, selectedPaymentMethod])

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-row items-center justify-between mb-6">
        <h2
          className="font-syne text-xl font-black flex items-center gap-2"
          style={{
            color: "var(--text)",
            opacity: !isOpen && !paymentReady ? 0.4 : 1,
          }}
        >
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid style={{ color: "var(--teal)" }} />}
        </h2>
        {!isOpen && paymentReady && (
          <button
            onClick={handleEdit}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--teal)" }}
            data-testid="edit-payment-button"
          >
            Edit
          </button>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!hasShippingMethod && (
            <div
              className="mb-4 rounded-xl p-4"
              style={{
                background: "rgba(255, 159, 10, 0.08)",
                border: "1px solid rgba(255, 159, 10, 0.35)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Delivery method required
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                Pick a shipping method first, then return to payment.
              </p>
              <button
                type="button"
                onClick={handleGoToDelivery}
                className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{
                  color: "#7c2d12",
                  background: "rgba(255, 159, 10, 0.18)",
                  border: "1px solid rgba(255, 159, 10, 0.4)",
                }}
              >
                Go to delivery
              </button>
            </div>
          )}

          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setPaymentMethod(value)}
              >
                {availablePaymentMethods.map((paymentMethod) => (
                  <div key={paymentMethod.id}>
                    {isStripeLike(paymentMethod.id) ? (
                      <StripeCardContainer
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                        paymentInfoMap={paymentInfoMap}
                        setCardBrand={setCardBrand}
                        setError={setError}
                        setCardComplete={setCardComplete}
                      />
                    ) : (
                      <PaymentContainer
                        paymentInfoMap={paymentInfoMap}
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                      />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Payment method</span>
              <span className="text-sm" style={{ color: "var(--text)" }} data-testid="payment-method-summary">Gift card</span>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <button
            className="btn-primary mt-6"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !canContinueToReview
            }
            data-testid="submit-payment-button"
          >
            {!hasShippingMethod
              ? "Select delivery first"
              : isStripeLike(selectedPaymentMethod) && !cardComplete
              ? "Enter card details to continue"
              : !activeSession && isStripeLike(selectedPaymentMethod)
              ? "Enter card details"
              : "Continue to review"}
          </button>
          {readinessMessage ? (
            <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>
              {readinessMessage}
            </p>
          ) : (
            <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>
              Next, you will review your order details before placing it.
            </p>
          )}
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-6 flex-wrap">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Payment method</span>
                <span className="text-sm" style={{ color: "var(--text)" }} data-testid="payment-method-summary">
                  {paymentInfoMap[activeSession?.provider_id]?.title || activeSession?.provider_id}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Payment details</span>
                <div className="flex gap-2 items-center" style={{ color: "var(--text-dim)" }} data-testid="payment-details-summary">
                  <span
                    className="flex items-center justify-center h-7 w-7 rounded-lg"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  >
                    {paymentInfoMap[selectedPaymentMethod]?.icon || <CreditCard />}
                  </span>
                  <span className="text-sm">
                    {isStripeLike(selectedPaymentMethod) && cardBrand
                      ? cardBrand
                      : isPaypal(selectedPaymentMethod)
                      ? "You'll confirm in PayPal"
                      : isManual(selectedPaymentMethod)
                      ? "Payment is collected offline after order confirmation"
                      : "Another step will appear"}
                  </span>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Payment method</span>
              <span className="text-sm" style={{ color: "var(--text)" }} data-testid="payment-method-summary">Gift card</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Payment
