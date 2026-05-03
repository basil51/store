"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { useCurrency } from "@lib/context/currency-context"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import type { StorefrontSettings } from "@lib/types/storefront-settings"
import { HttpTypes } from "@medusajs/types"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemSetup from "@modules/common/components/line-item-setup"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const CartDropdown = ({
  cart: cartState,
  storeSettings,
}: {
  cart?: HttpTypes.StoreCart | null
  storeSettings: StorefrontSettings
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemSubtotal = cartState?.item_subtotal ?? subtotal
  const { displayPrice } = useCurrency()
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
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
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full">
          <LocalizedClientLink
            className="hover:underline"
            href="/cart"
            data-testid="nav-cart-link"
          >{t("navCartWithCount", { count: totalItems })}</LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-2"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-2"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+8px)] w-[400px] rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              insetInlineEnd: 0,
            }}
            data-testid="nav-cart-dropdown"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h3
                className="font-syne text-base font-black uppercase tracking-widest"
                style={{ color: "var(--text)" }}
              >
                {t("miniCartTitle")}
              </h3>
              {totalItems > 0 && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--teal)",
                    color: "var(--bg)",
                  }}
                >
                  {t("miniCartItemsCount", { count: totalItems })}
                </span>
              )}
            </div>

            {cartState && cartState.items?.length ? (
              <>
                {/* Items list */}
                <div className="overflow-y-auto max-h-[360px] no-scrollbar">
                  <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                    {cartState.items
                      .sort((a, b) =>
                        (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                      )
                      .map((item) => (
                        <div
                          className="grid grid-cols-[80px_1fr] gap-x-4 px-5 py-4"
                          key={item.id}
                          data-testid="cart-item"
                        >
                          <LocalizedClientLink
                            href={`/products/${item.product_handle}`}
                            className="block rounded-xl overflow-hidden flex-shrink-0"
                            style={{ border: "1px solid var(--border)" }}
                          >
                            <Thumbnail
                              thumbnail={item.thumbnail}
                              images={item.variant?.product?.images}
                              size="square"
                            />
                          </LocalizedClientLink>

                          <div className="flex flex-col gap-y-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <LocalizedClientLink
                                href={`/products/${item.product_handle}`}
                                data-testid="product-link"
                                className="text-sm font-semibold leading-snug truncate hover:underline"
                                style={{ color: "var(--text)" }}
                              >
                                {item.title}
                              </LocalizedClientLink>
                              <div className="flex-shrink-0">
                                <LineItemPrice item={item} style="tight" />
                              </div>
                            </div>

                            <div
                              className="text-xs"
                              style={{ color: "var(--text-dim)" }}
                            >
                              <LineItemOptions
                                variant={item.variant}
                                data-testid="cart-item-variant"
                                data-value={item.variant}
                              />
                            </div>

                            <LineItemSetup item={item} compact />

                            <div className="flex items-center justify-between mt-1">
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-dim)" }}
                                data-testid="cart-item-quantity"
                                data-value={item.quantity}
                              >
                                {t("miniCartQty", { count: item.quantity })}
                              </span>
                              <DeleteButton
                                id={item.id}
                                data-testid="cart-item-remove-button"
                              >
                                <span
                                  className="text-xs hover:underline"
                                  style={{ color: "var(--coral)" }}
                                >
                                  {t("miniCartRemove")}
                                </span>
                              </DeleteButton>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex flex-col gap-y-4 px-5 py-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {/* Free shipping progress */}
                  {showFreeShippingProgress && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: freeShippingReached
                          ? "rgba(0, 229, 200, 0.08)"
                          : "var(--surface2)",
                        border: `1px solid ${
                          freeShippingReached ? "var(--teal)" : "var(--border)"
                        }`,
                      }}
                      data-testid="nav-cart-free-shipping-progress"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {freeShippingReached
                            ? `🎉 ${t("freeShippingProgressUnlocked")}`
                            : t("freeShippingProgressRemaining", {
                                amount: displayPrice(freeShippingRemaining),
                              })}
                        </p>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
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
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: "var(--border)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${freeShippingProgress * 100}%`,
                            background: freeShippingReached
                              ? "var(--teal)"
                              : "var(--coral)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--text)" }}
                    >
                      {t("miniCartSubtotal")}
                      <span
                        className="font-normal text-xs"
                        style={{ color: "var(--text-dim)", marginInlineStart: "0.25rem" }}
                      >
                        {t("miniCartSubtotalExcludingTaxes")}
                      </span>
                    </span>
                    <span
                      className="font-syne text-base font-black"
                      style={{ color: "var(--teal)" }}
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {displayPrice(subtotal)}
                    </span>
                  </div>

                  {/* CTA */}
                  <LocalizedClientLink href="/cart" passHref>
                    <button
                      className="btn-primary w-full text-sm"
                      data-testid="go-to-cart-button"
                    >
                      {t("miniCartViewCartCheckout")}
                    </button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center gap-y-4 py-14 px-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <span className="text-xl">🛍️</span>
                </div>
                <div className="text-center">
                  <p
                    className="font-syne font-bold text-sm"
                    style={{ color: "var(--text)" }}
                  >
                    {t("cartEmptyTitle")}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {t("miniCartEmptyDescription")}
                  </p>
                </div>
                <LocalizedClientLink href="/store">
                  <button
                    className="btn-ghost text-sm"
                    onClick={close}
                  >
                    {t("cartEmptyExploreProducts")}
                  </button>
                </LocalizedClientLink>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
