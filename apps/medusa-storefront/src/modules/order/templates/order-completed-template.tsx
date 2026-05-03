import { cookies as nextCookies } from "next/headers"

import { getLocale } from "@lib/data/locale-actions"
import { getAccountCopy } from "@modules/account/account-copy"
import CartTotals from "@modules/common/components/cart-totals"
import CheckoutSuccessAnalytics from "@modules/order/components/checkout-success-analytics"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import PresetPurchaseAnalytics, {
  type PresetPurchaseAnalyticsEntry,
} from "@modules/order/components/preset-purchase-analytics"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()
  const locale = await getLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1], params?: Record<string, string | number>) =>
    getAccountCopy(locale, key, params)

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  const presetPurchaseEntries = (order.items ?? [])
    .map((item) => {
      const metadata = (item.metadata ?? {}) as Record<string, unknown>
      const presetKey =
        typeof metadata.variant_combination_key === "string"
          ? metadata.variant_combination_key.trim()
          : ""
      const presetTitle =
        typeof metadata.variant_combination_title === "string"
          ? metadata.variant_combination_title.trim()
          : ""

      if (!presetKey || !presetTitle) {
        return null
      }

      const optionValues =
        metadata.variant_combination_option_values &&
        typeof metadata.variant_combination_option_values === "object" &&
        !Array.isArray(metadata.variant_combination_option_values)
          ? Object.entries(
              metadata.variant_combination_option_values as Record<string, unknown>
            ).reduce<Record<string, string>>((acc, [key, value]) => {
              if (typeof value !== "string") {
                return acc
              }

              const normalizedKey = key.trim()
              const normalizedValue = value.trim()

              if (normalizedKey && normalizedValue) {
                acc[normalizedKey] = normalizedValue
              }

              return acc
            }, {})
          : undefined

      return {
        line_item_id: item.id,
        quantity: item.quantity,
        line_total: typeof item.total === "number" ? item.total : undefined,
        preset_key: presetKey,
        preset_title: presetTitle,
        preset_badge:
          typeof metadata.variant_combination_badge === "string"
            ? metadata.variant_combination_badge.trim()
            : undefined,
        preset_is_default: metadata.variant_combination_is_default === true,
        option_values:
          optionValues && Object.keys(optionValues).length ? optionValues : undefined,
        product_id: item.product_id,
        product_handle: item.product_handle,
        product_title: item.product_title,
        variant_id: item.variant_id,
      } satisfies PresetPurchaseAnalyticsEntry
    })
    .filter((entry): entry is PresetPurchaseAnalyticsEntry => !!entry)

  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        <CheckoutSuccessAnalytics
          orderId={order.id}
          currencyCode={order.currency_code}
          total={typeof order.total === "number" ? order.total : undefined}
        />
        <PresetPurchaseAnalytics
          orderId={order.id}
          currencyCode={order.currency_code}
          entries={presetPurchaseEntries}
        />
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-6 max-w-4xl w-full rounded-2xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          data-testid="order-complete-container"
        >
          <div>
            <h1
              className="font-syne text-3xl font-black mb-1"
              style={{ color: "var(--text)" }}
            >
              {t("orderConfirmedThankYou")}
            </h1>
            <p className="text-base" style={{ color: "var(--text-dim)" }}>
              {t("orderConfirmedPlacedSuccessfully")}
            </p>
          </div>
          <OrderDetails order={order} />
          <div>
            <h2
              className="font-syne text-xl font-black mb-4"
              style={{ color: "var(--text)" }}
            >
              {t("orderConfirmedSummaryTitle")}
            </h2>
            <Items order={order} />
          </div>
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          <Help />
        </div>
      </div>
    </div>
  )
}
