"use client"

import { trackPresetPurchased } from "@lib/util/analytics"
import { useEffect } from "react"

export type PresetPurchaseAnalyticsEntry = {
  line_item_id: string
  quantity: number
  line_total?: number
  preset_key: string
  preset_title: string
  preset_badge?: string
  preset_is_default?: boolean
  option_values?: Record<string, string>
  product_id?: string
  product_handle?: string
  product_title?: string
  variant_id?: string
}

const getStorageKey = (orderId: string) =>
  `nexmart:preset-purchased:tracked:${orderId}`

const PresetPurchaseAnalytics = ({
  orderId,
  currencyCode,
  entries,
}: {
  orderId: string
  currencyCode: string
  entries: PresetPurchaseAnalyticsEntry[]
}) => {
  useEffect(() => {
    if (!entries.length) {
      return
    }

    try {
      const storageKey = getStorageKey(orderId)

      if (window.localStorage.getItem(storageKey) === "1") {
        return
      }

      entries.forEach((entry) => {
        trackPresetPurchased({
          order_id: orderId,
          currency_code: currencyCode,
          line_item_id: entry.line_item_id,
          quantity: entry.quantity,
          line_total: entry.line_total,
          preset_key: entry.preset_key,
          preset_title: entry.preset_title,
          preset_badge: entry.preset_badge,
          preset_is_default: entry.preset_is_default,
          option_values: entry.option_values,
          product_id: entry.product_id,
          product_handle: entry.product_handle,
          product_title: entry.product_title,
          variant_id: entry.variant_id,
        })
      })

      window.localStorage.setItem(storageKey, "1")
    } catch {
      // Ignore analytics storage issues (private mode, disabled storage, etc.)
    }
  }, [currencyCode, entries, orderId])

  return null
}

export default PresetPurchaseAnalytics
