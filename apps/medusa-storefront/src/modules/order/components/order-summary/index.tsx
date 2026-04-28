import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
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
        Order Summary
      </h3>
      <div className="flex flex-col gap-y-2 text-sm">
        <div className="flex items-center justify-between font-medium" style={{ color: "var(--text)" }}>
          <span>Subtotal</span>
          <span>{getAmount(order.subtotal)}</span>
        </div>
        <div className="flex flex-col gap-y-1" style={{ color: "var(--text-dim)" }}>
          {order.discount_total > 0 && (
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span style={{ color: "var(--teal)" }}>- {getAmount(order.discount_total)}</span>
            </div>
          )}
          {order.gift_card_total > 0 && (
            <div className="flex items-center justify-between">
              <span>Gift card</span>
              <span style={{ color: "var(--teal)" }}>- {getAmount(order.gift_card_total)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>{getAmount(order.shipping_total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Taxes</span>
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
          <span>Total</span>
          <span style={{ color: "var(--teal)" }}>{getAmount(order.total)}</span>
        </div>
      </div>
    </div>
  )
}

export default OrderSummary
