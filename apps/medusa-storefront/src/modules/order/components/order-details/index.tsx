import { isManual } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const payment = order.payment_collections?.[0].payments?.[0]
  const isOfflinePayment = isManual(payment?.provider_id)

  const formatStatus = (str: string) => {
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        We have sent the order confirmation details to{" "}
        <span
          className="font-semibold"
          style={{ color: "var(--text)" }}
          data-testid="order-email"
        >
          {order.email}
        </span>
        .
      </p>
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        Order date:{" "}
        <span style={{ color: "var(--text)" }} data-testid="order-date">
          {new Date(order.created_at).toDateString()}
        </span>
      </p>
      {isOfflinePayment ? (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Payment for this order will be arranged offline after confirmation.
        </p>
      ) : null}
      <p className="text-sm font-semibold" style={{ color: "var(--teal)" }}>
        Order #{" "}
        <span data-testid="order-id">{order.display_id}</span>
      </p>

      {showStatus && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            Order status:{" "}
            <span className="font-semibold" style={{ color: "var(--text)" }} data-testid="order-status">
              {formatStatus(order.fulfillment_status)}
            </span>
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            Payment:{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--text)" }}
              data-value="order-payment-status"
            >
              {formatStatus(order.payment_status)}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

export default OrderDetails
