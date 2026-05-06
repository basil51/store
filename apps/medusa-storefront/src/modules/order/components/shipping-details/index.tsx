"use client"

import { convertToLocale } from "@lib/util/money"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { HttpTypes } from "@medusajs/types"
import { getAccountCopy } from "@modules/account/account-copy"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) =>
    getAccountCopy(locale, key)
  const shippingMethod = order.shipping_methods?.[0]

  return (
    <div>
      <h3
        className="font-syne text-lg font-black mb-4"
        style={{ color: "var(--text)" }}
      >
        {t("deliveryTitle")}
      </h3>
      <div className="flex flex-wrap gap-6">
        <div
          className="flex flex-col gap-y-1 min-w-[140px]"
          data-testid="shipping-address-summary"
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>
            {t("shippingAddress")}
          </p>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {order.shipping_address?.address_1}{" "}
            {order.shipping_address?.address_2}
          </p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {order.shipping_address?.postal_code},{" "}
            {order.shipping_address?.city}
          </p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {order.shipping_address?.country_code?.toUpperCase()}
          </p>
        </div>

        <div
          className="flex flex-col gap-y-1 min-w-[140px]"
          data-testid="shipping-contact-summary"
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>{t("contact")}</p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {order.shipping_address?.phone}
          </p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>{order.email}</p>
        </div>

        <div
          className="flex flex-col gap-y-1 min-w-[140px]"
          data-testid="shipping-method-summary"
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>{t("method")}</p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {shippingMethod?.name ?? "-"} (
            {convertToLocale({
              amount: shippingMethod?.total ?? 0,
              currency_code: order.currency_code,
            })}
            )
          </p>
        </div>
      </div>
      <Divider className="mt-6" />
    </div>
  )
}

export default ShippingDetails
