"use client"

import { trackCheckoutPlaceOrderSuccess } from "@lib/util/analytics"
import { useEffect } from "react"

const getStorageKey = (orderId: string) =>
  `nexmart:checkout-success:tracked:${orderId}`

const CheckoutSuccessAnalytics = ({
  orderId,
  currencyCode,
  total,
}: {
  orderId: string
  currencyCode: string
  total?: number
}) => {
  useEffect(() => {
    try {
      const storageKey = getStorageKey(orderId)

      if (window.localStorage.getItem(storageKey) === "1") {
        return
      }

      trackCheckoutPlaceOrderSuccess({
        order_id: orderId,
        currency_code: currencyCode,
        total,
      })

      window.localStorage.setItem(storageKey, "1")
      return
    } catch {
      // Ignore storage limitations while still emitting analytics.
    }

    trackCheckoutPlaceOrderSuccess({
      order_id: orderId,
      currency_code: currencyCode,
      total,
    })
  }, [currencyCode, orderId, total])

  return null
}

export default CheckoutSuccessAnalytics
