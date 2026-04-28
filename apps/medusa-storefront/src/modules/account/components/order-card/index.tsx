import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LineItemSetup from "@modules/common/components/line-item-setup"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])

  return (
    <div
      className="flex flex-col rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      data-testid="order-card"
    >
      <div
        className="font-syne font-bold text-base mb-1"
        style={{ color: "var(--teal)" }}
      >
        #<span data-testid="order-display-id">{order.display_id}</span>
      </div>
      <div
        className="flex items-center gap-3 text-sm mb-4"
        style={{ color: "var(--text-dim)" }}
      >
        <span data-testid="order-created-at">
          {new Date(order.created_at).toDateString()}
        </span>
        <span style={{ color: "var(--border)" }}>·</span>
        <span data-testid="order-amount" style={{ color: "var(--text)" }}>
          {convertToLocale({
            amount: order.total,
            currency_code: order.currency_code,
          })}
        </span>
        <span style={{ color: "var(--border)" }}>·</span>
        <span>{`${numberOfLines} ${numberOfLines > 1 ? "items" : "item"}`}</span>
      </div>
      <div className="grid grid-cols-2 small:grid-cols-4 gap-3 mb-4">
        {order.items?.slice(0, 3).map((i) => (
          <div key={i.id} className="flex flex-col gap-y-2" data-testid="order-item">
            <Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
            <div className="flex items-center gap-1 text-xs">
              <span
                className="font-medium truncate"
                style={{ color: "var(--text)" }}
                data-testid="item-title"
              >
                {i.title}
              </span>
              <span style={{ color: "var(--text-dim)" }}>×{i.quantity}</span>
            </div>
            <LineItemSetup item={i} compact />
          </div>
        ))}
        {numberOfProducts > 4 && (
          <div className="flex flex-col items-center justify-center text-xs" style={{ color: "var(--text-dim)" }}>
            <span>+{numberOfLines - 4}</span>
            <span>more</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <button className="btn-ghost text-sm" data-testid="order-details-link">
            See details →
          </button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
