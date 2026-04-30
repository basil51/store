"use client"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) => getAccountCopy(locale, key)

  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-4 w-full">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center gap-y-4 py-12"
      data-testid="no-orders-container"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <span className="text-2xl">📦</span>
      </div>
      <div className="text-center">
        <h2
          className="font-syne text-xl font-bold mb-1"
          style={{ color: "var(--text)" }}
        >
          {t("noOrdersYet")}
        </h2>
        <p
          className="text-sm"
          style={{ color: "var(--text-dim)" }}
        >
          {t("noOrdersCta")}
        </p>
      </div>
      <LocalizedClientLink href="/store" passHref>
        <button
          className="btn-primary text-sm mt-2"
          data-testid="continue-shopping-button"
        >
          {t("startShopping")}
        </button>
      </LocalizedClientLink>
    </div>
  )
}

export default OrderOverview
