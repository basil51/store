"use client"

import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
}) => {
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) =>
    getAccountCopy(locale, key)

  return (
    <div className="flex flex-col justify-center gap-y-4">
      <div className="flex gap-2 justify-between items-center">
        <h1
          className="font-syne text-2xl font-black"
          style={{ color: "var(--text)" }}
        >
          {t("orderDetailsTitle")}
        </h1>
        <LocalizedClientLink
          href="/account/orders"
          className="flex gap-2 items-center text-sm hover:underline"
          style={{ color: "var(--text-dim)" }}
          data-testid="back-to-overview-button"
        >
          <XMark /> {t("backToOverview")}
        </LocalizedClientLink>
      </div>
      <div
        className="flex flex-col gap-6 w-full rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        data-testid="order-details-container"
      >
        <OrderDetails order={order} showStatus />
        <Items order={order} />
        <ShippingDetails order={order} />
        <OrderSummary order={order} />
        <Help />
      </div>
    </div>
  )
}

export default OrderDetailsTemplate
