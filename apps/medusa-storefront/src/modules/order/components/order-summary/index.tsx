"use client"

import { convertToLocale } from "@lib/util/money"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { HttpTypes } from "@medusajs/types"
import { getAccountCopy } from "@modules/account/account-copy"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) =>
    getAccountCopy(locale, key)

  const getAmount = (amount?: number | null) => {
    if (!amount) {
      return
    }

    return convertToLocale({
      amount,
      currency_code: order.currency_code,
    })
  }

  return (
    <div>
      <h3
        className="font-syne text-lg font-black mb-4"
        style={{ color: "var(--text)" }}
      >
        {t("orderSummaryTitle")}
      </h3>
      <div className="flex flex-col gap-y-2 text-sm">
        <div className="flex items-center justify-between font-medium" style={{ color: "var(--text)" }}>
          <span>{t("subtotal")}</span>
          <span>{getAmount(order.subtotal)}</span>
        </div>
        <div className="flex flex-col gap-y-1" style={{ color: "var(--text-dim)" }}>
          {order.discount_total > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("discount")}</span>
              <span style={{ color: "var(--teal)" }}>- {getAmount(order.discount_total)}</span>
            </div>
          )}
          {order.gift_card_total > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("giftCard")}</span>
              <span style={{ color: "var(--teal)" }}>- {getAmount(order.gift_card_total)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>{t("shipping")}</span>
            <span>{getAmount(order.shipping_total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("taxes")}</span>
            <span>{getAmount(order.tax_total)}</span>
          </div>
        </div>
        <div
          className="h-px w-full my-2"
          style={{ background: "var(--border)" }}
        />
        <div
          className="flex items-center justify-between font-syne text-base font-black"
          style={{ color: "var(--text)" }}
        >
          <span>{t("total")}</span>
          <span style={{ color: "var(--teal)" }}>{getAmount(order.total)}</span>
        </div>
      </div>
    </div>
  )
}

export default OrderSummary
