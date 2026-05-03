"use client"

import { isManual } from "@lib/constants"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { HttpTypes } from "@medusajs/types"
import { getAccountCopy } from "@modules/account/account-copy"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) =>
    getAccountCopy(locale, key)
  const payment = order.payment_collections?.[0].payments?.[0]
  const isOfflinePayment = isManual(payment?.provider_id)

  const formatStatus = (str: string) => {
    const keyMap = {
      pending: "statusPending",
      not_paid: "statusNotPaid",
      awaiting: "statusAwaiting",
      authorized: "statusAuthorized",
      captured: "statusCaptured",
      partially_captured: "statusPartiallyCaptured",
      refunded: "statusRefunded",
      partially_refunded: "statusPartiallyRefunded",
      canceled: "statusCanceled",
      not_fulfilled: "statusNotFulfilled",
      partially_fulfilled: "statusPartiallyFulfilled",
      fulfilled: "statusFulfilled",
      partially_shipped: "statusPartiallyShipped",
      shipped: "statusShipped",
      delivered: "statusDelivered",
      requires_action: "statusRequiresAction",
    } as const satisfies Record<string, Parameters<typeof getAccountCopy>[1]>

    const localizedKey = keyMap[str as keyof typeof keyMap]

    if (localizedKey) {
      return t(localizedKey)
    }

    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  const orderDate = new Date(order.created_at).toLocaleDateString(locale ?? undefined, {
    dateStyle: "medium",
  })

  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        {t("orderConfirmationSentTo")}{" "}
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
        {t("orderDate")}:{" "}
        <span style={{ color: "var(--text)" }} data-testid="order-date">
          {orderDate}
        </span>
      </p>
      {isOfflinePayment ? (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          {t("orderOfflinePaymentNotice")}
        </p>
      ) : null}
      <p className="text-sm font-semibold" style={{ color: "var(--teal)" }}>
        {t("orderNumber")}: {"#"}
        <span data-testid="order-id">{order.display_id}</span>
      </p>

      {showStatus && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("orderStatus")}:{" "}
            <span className="font-semibold" style={{ color: "var(--text)" }} data-testid="order-status">
              {formatStatus(order.fulfillment_status)}
            </span>
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("paymentStatus")}:{" "}
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
