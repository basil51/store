"use client"

import { Radio, RadioGroup } from "@headlessui/react"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import type { StorefrontSettings } from "@lib/types/storefront-settings"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MedusaRadio from "@modules/common/components/radio"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
  storeSettings: StorefrontSettings
}

function formatAddress(address: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
  storeSettings,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const isOpen = searchParams.get("step") === "delivery"

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type !== "pickup"
  )

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type === "pickup"
  )

  const hasPickupOptions = !!_pickupMethods?.length
  const itemSubtotal = cart.item_subtotal ?? cart.subtotal ?? 0
  const freeShippingThreshold = storeSettings.freeShippingThreshold
  const showFreeShippingBanner =
    typeof freeShippingThreshold === "number" && freeShippingThreshold > 0
  const freeShippingRemaining = showFreeShippingBanner
    ? Math.max(freeShippingThreshold - itemSubtotal, 0)
    : 0
  const freeShippingReached =
    showFreeShippingBanner && freeShippingRemaining === 0
  const freeShippingProgress = showFreeShippingBanner
    ? Math.min(itemSubtotal / freeShippingThreshold, 1)
    : 0
  const hasSelectedShippingMethod = Boolean(shippingMethodId)

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => (pricesMap[p.value?.id || ""] = p.value?.amount!))

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      }
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)

        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

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
            opacity: !isOpen && cart.shipping_methods?.length === 0 ? 0.4 : 1,
          }}
        >
          Delivery
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid style={{ color: "var(--teal)" }} />
          )}
        </h2>
        {!isOpen && cart?.shipping_address && cart?.billing_address && cart?.email && (
          <button
            onClick={handleEdit}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--teal)" }}
            data-testid="edit-delivery-button"
          >
            Edit
          </button>
        )}
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col mb-4">
              <span className="font-medium text-sm" style={{ color: "var(--text)" }}>Shipping method</span>
              <span className="text-sm" style={{ color: "var(--text-dim)" }}>How would you like your order delivered</span>
            </div>
            {showFreeShippingBanner && (
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
                data-testid="delivery-free-shipping-banner"
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
                            amount: convertToLocale({
                              amount: freeShippingRemaining,
                              currency_code: cart.currency_code,
                            }),
                          })}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("freeShippingProgressThreshold", {
                        amount: convertToLocale({
                          amount: freeShippingThreshold,
                          currency_code: cart.currency_code,
                        }),
                      })}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color: freeShippingReached
                        ? "var(--teal)"
                        : "var(--text-dim)",
                    }}
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
                      background: freeShippingReached
                        ? "var(--teal)"
                        : "var(--coral)",
                    }}
                  />
                </div>

                {!freeShippingReached && (
                  <LocalizedClientLink
                    href="/store"
                    className="mt-3 inline-flex text-xs font-semibold"
                    style={{ color: "var(--teal)" }}
                    data-testid="delivery-free-shipping-continue-shopping-link"
                  >
                    {t("freeShippingProgressContinueShopping")}
                  </LocalizedClientLink>
                )}
              </div>
            )}
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(value) => {
                      const id = _pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id

                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className="flex items-center justify-between text-sm cursor-pointer py-3 rounded-xl px-4 mb-2 transition-all"
                      style={{
                        background: showPickupOptions === PICKUP_OPTION_ON ? "rgba(0,229,200,0.08)" : "var(--surface2)",
                        border: `1px solid ${showPickupOptions === PICKUP_OPTION_ON ? "var(--teal)" : "var(--border)"}`,
                      }}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                          <span className="text-sm" style={{ color: "var(--text)" }}>Pick up your order</span>
                        </div>
                        <span style={{ color: "var(--text-dim)" }}>-</span>
                    </Radio>
                  </RadioGroup>
                )}
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      return handleSetShippingMethod(v, "shipping")
                    }
                  }}
                >
                  {_shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className="flex items-center justify-between text-sm cursor-pointer py-3 rounded-xl px-4 mb-2 transition-all"
                        style={{
                          background: option.id === shippingMethodId ? "rgba(0,229,200,0.08)" : "var(--surface2)",
                          border: `1px solid ${option.id === shippingMethodId ? "var(--teal)" : "var(--border)"}`,
                          opacity: isDisabled ? 0.4 : 1,
                          cursor: isDisabled ? "not-allowed" : "pointer",
                        }}
                      >
                        <div className="flex items-center gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="text-sm" style={{ color: "var(--text)" }}>{option.name}</span>
                        </div>
                        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : calculatedPricesMap[option.id] ? (
                            convertToLocale({
                              amount: calculatedPricesMap[option.id],
                              currency_code: cart?.currency_code,
                            })
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid">
              <div className="flex flex-col mb-4">
                <span className="font-medium text-sm" style={{ color: "var(--text)" }}>Store</span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>Choose a store near you</span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 md:pt-0 pt-2">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => {
                      if (v) {
                        return handleSetShippingMethod(v, "pickup")
                      }
                    }}
                  >
                    {_pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className="flex items-center justify-between text-sm cursor-pointer py-3 rounded-xl px-4 mb-2 transition-all"
                          style={(bag) => ({
                            background: option.id === shippingMethodId ? "rgba(0,229,200,0.08)" : "var(--surface2)",
                            border: `1px solid ${option.id === shippingMethodId ? "var(--teal)" : "var(--border)"}`,
                            opacity: option.insufficient_inventory ? 0.4 : 1,
                            cursor: option.insufficient_inventory ? "not-allowed" : "pointer",
                          })}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm" style={{ color: "var(--text)" }}>{option.name}</span>
                              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                                {formatAddress(
                                  option.service_zone?.fulfillment_set?.location?.address
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <button
              className="btn-primary mt-4"
              onClick={handleSubmit}
              disabled={isLoading || !hasSelectedShippingMethod}
              data-testid="submit-delivery-option-button"
            >
              {isLoading ? <Loader /> : "Continue to payment"}
            </button>
          </div>
        </>
      ) : (
        <div>
          {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Method</span>
              <span className="text-sm" style={{ color: "var(--text)" }}>
                {cart.shipping_methods!.at(-1)!.name}{" "}
                {convertToLocale({
                  amount: cart.shipping_methods!.at(-1)!.amount!,
                  currency_code: cart?.currency_code,
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Shipping
