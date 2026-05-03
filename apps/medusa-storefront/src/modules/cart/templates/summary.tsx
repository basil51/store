"use client"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import { useCurrency } from "@lib/context/currency-context"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import {
  trackWhatsAppContinueClicked,
  trackWhatsAppMessageCopied,
  trackWhatsAppPreviewOpened,
  type WhatsAppFunnelPayload,
} from "@lib/util/analytics"
import { buildLocalizedWhatsAppCartLine } from "@lib/util/whatsapp-product-summary"
import {
  applyWhatsAppTemplate,
  buildWhatsAppCustomerNote,
  getWhatsAppTemplateForLocale,
} from "@lib/util/whatsapp"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WhatsAppPreviewModal from "@modules/common/components/whatsapp-preview-modal"
import { HttpTypes } from "@medusajs/types"
import type { StorefrontSettings } from "@lib/types/storefront-settings"
import { useRef, useState } from "react"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
  storeSettings: StorefrontSettings
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart, storeSettings }: SummaryProps) => {
  const [isWhatsAppPreviewOpen, setIsWhatsAppPreviewOpen] = useState(false)
  const [whatsAppPreviewMessage, setWhatsAppPreviewMessage] = useState("")
  const [whatsAppCustomerNote, setWhatsAppCustomerNote] = useState("")
  const whatsAppPreviewAnalyticsRef = useRef<WhatsAppFunnelPayload | null>(null)
  const step = getCheckoutStep(cart)
  const { displayPrice, currency } = useCurrency()
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const itemSubtotal = cart.item_subtotal ?? cart.subtotal ?? 0
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

  const canUseWhatsApp =
    !!storeSettings.whatsappNumber &&
    (storeSettings.cartMode === "whatsapp" || storeSettings.cartMode === "both")

  const handleWhatsAppCheckout = () => {
    const items = (cart.items ?? [])
      .map((item) => {
        const metadata = (item.metadata ?? {}) as Record<string, unknown>
        const presetTitle =
          typeof metadata.variant_combination_title === "string"
            ? metadata.variant_combination_title.trim()
            : ""
        const variantTitle =
          typeof item.variant?.title === "string" &&
          item.variant.title.trim() &&
          item.variant.title.trim().toLowerCase() !== "default variant"
            ? item.variant.title.trim()
            : ""

        return buildLocalizedWhatsAppCartLine({
          quantity: item.quantity ?? 0,
          title: item.title,
          product:
            ((item as unknown as {
              product?: { metadata?: Record<string, unknown> | null; options?: unknown[] | null }
            }).product ??
              item.variant?.product ??
              null) as {
              metadata?: Record<string, unknown> | null
              options?: unknown[] | null
            } | null,
          variantOptions: item.variant?.options,
          locale,
          variantTitle,
          presetTitle,
          setupLabel: t("whatsappMessageSetupLabel"),
        })
      })
      .join("\n")

    const total = displayPrice(cart.total ?? 0)
    const quantity = (cart.items ?? []).reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0
    )

    const whatsappTemplate = getWhatsAppTemplateForLocale({
      templates: storeSettings.whatsappTemplates,
      locale,
      fallbackTemplate: storeSettings.whatsappTemplate,
    })

    const customerNote = buildWhatsAppCustomerNote({
      note: whatsAppCustomerNote,
      label: t("whatsappCustomerNoteMessageLabel"),
    })

    const renderedMessage = applyWhatsAppTemplate({
      template: whatsappTemplate,
      replacements: {
        items,
        total,
        currency,
        store_name: storeSettings.storeName ?? "",
        product_name: "",
        product_specs: "",
        quantity,
        unit_price: "",
        line_total: total,
        preset_title: "",
        customer_note: customerNote,
      },
    })

    const message =
      customerNote && !/\{\{\s*customer_note\s*\}\}/.test(whatsappTemplate)
        ? `${renderedMessage}\n${customerNote}`
        : renderedMessage

    whatsAppPreviewAnalyticsRef.current = {
      source: "cart_summary",
      locale,
      message_length: message.length,
      currency_code: currency,
      quantity,
      total: cart.total ?? undefined,
      cart_id: cart.id,
      item_count: cart.items?.length ?? 0,
    }
    setWhatsAppPreviewMessage(message)
    setIsWhatsAppPreviewOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-y-5">
        <h2
          className="font-syne text-2xl font-bold"
          style={{ color: "var(--text)" }}
        >
          {t("cartSummaryTitle")}
        </h2>

        <DiscountCode cart={cart} />

        {showFreeShippingProgress && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: freeShippingReached
                ? "rgba(0, 229, 200, 0.08)"
                : "var(--surface2)",
              border: `1px solid ${
                freeShippingReached ? "var(--teal)" : "var(--border)"
              }`,
            }}
            data-testid="free-shipping-progress"
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
                style={{
                  color: freeShippingReached ? "var(--teal)" : "var(--text-dim)",
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
                  background: freeShippingReached ? "var(--teal)" : "var(--coral)",
                }}
              />
            </div>

            {!freeShippingReached && (
              <LocalizedClientLink
                href="/store"
                className="mt-3 inline-flex text-xs font-semibold"
                style={{ color: "var(--teal)" }}
                data-testid="free-shipping-continue-shopping-link"
              >
                {t("freeShippingProgressContinueShopping")}
              </LocalizedClientLink>
            )}
          </div>
        )}

        <div
          className="h-px w-full"
          style={{ background: "var(--border)" }}
        />

        <CartTotals totals={cart} />

        {canUseWhatsApp && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
            }}
          >
            <label
              htmlFor="cart-whatsapp-note"
              className="text-sm font-bold"
              style={{ color: "var(--text)" }}
            >
              {t("whatsappCustomerNoteFieldLabel")}
            </label>
            <textarea
              id="cart-whatsapp-note"
              value={whatsAppCustomerNote}
              onChange={(event) => setWhatsAppCustomerNote(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                resize: "vertical",
              }}
              placeholder={t("whatsappCustomerNoteFieldPlaceholder")}
              data-testid="cart-whatsapp-note-input"
            />
            <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
              {t("whatsappCustomerNoteFieldHint")}
            </p>
          </div>
        )}

        {storeSettings.cartMode !== "whatsapp" && (
          <LocalizedClientLink
            href={"/checkout?step=" + step}
            data-testid="checkout-button"
          >
            <button
              className="btn-primary w-full py-3 text-base font-bold"
              style={{ borderRadius: "0.75rem" }}
            >
              {t("cartCheckoutCta")}
            </button>
          </LocalizedClientLink>
        )}

        {canUseWhatsApp && (
          <button
            onClick={handleWhatsAppCheckout}
            className="w-full py-3 text-base font-bold"
            style={{
              borderRadius: "0.75rem",
              background: "#25D366",
              color: "#052e16",
            }}
            data-testid="cart-whatsapp-button"
          >
            {t("productActionsOrderOnWhatsApp")}
          </button>
        )}
      </div>
      <WhatsAppPreviewModal
        isOpen={isWhatsAppPreviewOpen}
        close={() => setIsWhatsAppPreviewOpen(false)}
        message={whatsAppPreviewMessage}
        phoneNumber={storeSettings.whatsappNumber}
        onOpen={() => {
          if (whatsAppPreviewAnalyticsRef.current) {
            trackWhatsAppPreviewOpened(whatsAppPreviewAnalyticsRef.current)
          }
        }}
        onCopy={() => {
          if (whatsAppPreviewAnalyticsRef.current) {
            trackWhatsAppMessageCopied(whatsAppPreviewAnalyticsRef.current)
          }
        }}
        onContinue={() => {
          if (whatsAppPreviewAnalyticsRef.current) {
            trackWhatsAppContinueClicked(whatsAppPreviewAnalyticsRef.current)
          }
        }}
      />
    </>
  )
}

export default Summary
