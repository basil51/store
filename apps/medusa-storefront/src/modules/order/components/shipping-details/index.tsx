import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  return (
    <div>
      <h3
        className="font-syne text-lg font-black mb-4"
        style={{ color: "var(--text)" }}
      >
        Delivery
      </h3>
      <div className="flex flex-wrap gap-6">
        <div
          className="flex flex-col gap-y-1 min-w-[140px]"
          data-testid="shipping-address-summary"
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>
            Shipping Address
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
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>Contact</p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {order.shipping_address?.phone}
          </p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>{order.email}</p>
        </div>

        <div
          className="flex flex-col gap-y-1 min-w-[140px]"
          data-testid="shipping-method-summary"
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>Method</p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {(order as any).shipping_methods[0]?.name} (
            {convertToLocale({
              amount: order.shipping_methods?.[0].total ?? 0,
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
