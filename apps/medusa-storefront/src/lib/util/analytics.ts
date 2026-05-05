export type PresetSelectionSource =
  | "guided_presets"
  | "recommended_setups"
  | "restore_default"

export type CheckoutStep = "address" | "delivery" | "payment" | "review"

export type WhatsAppFunnelSource = "product_page" | "cart_summary"

export type CheckoutBlockerCode =
  | "missing_address_details"
  | "missing_delivery_method"
  | "missing_payment_method"
  | "incomplete_card_details"
  | "incomplete_checkout_requirements"
  | "payment_form_not_ready"
  | "payment_confirmation_error"
  | "place_order_error"

type PresetAnalyticsEventName =
  | "preset_selected"
  | "preset_added_to_cart"
  | "preset_purchased"

type WhatsAppAnalyticsEventName =
  | "whatsapp_preview_opened"
  | "whatsapp_message_copied"
  | "whatsapp_continue_clicked"

type PresetAnalyticsBasePayload = {
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

type PresetSelectedPayload = PresetAnalyticsBasePayload & {
  source: PresetSelectionSource
}

type PresetAddedToCartPayload = PresetAnalyticsBasePayload & {
  quantity: number
  currency_code?: string
  amount?: number
}

type PresetPurchasedPayload = PresetAnalyticsBasePayload & {
  order_id: string
  line_item_id: string
  quantity: number
  currency_code: string
  line_total?: number
  occurred_at?: string
}

export type WhatsAppFunnelPayload = {
  source: WhatsAppFunnelSource
  locale?: string
  message_length?: number
  currency_code?: string
  quantity?: number
  total?: number
  cart_id?: string
  item_count?: number
  product_id?: string
  product_handle?: string
  product_title?: string
  variant_id?: string
  preset_key?: string
  preset_title?: string
}

export type SearchAnalyticsPayload = {
  query: string
  locale?: string
  country_code?: string
  result_count?: number
  source?: "nav" | "store" | "store_recovery"
  recovery_source?: "override" | "analytics"
  recovered_query?: string
  recovered_from_query?: string
  original_result_count?: number
}

export type RecommendationAnalyticsPayload = {
  rail: "related_products"
  source_product_id: string
  source_product_handle?: string
  source_product_title?: string
  recommended_count: number
  recommended_product_ids?: string[]
  recommended_product_id?: string
  recommended_product_handle?: string
  recommended_product_title?: string
  recommendation_slot?: number
  locale?: string
  country_code?: string
}

type AnalyticsPayload = Record<string, unknown>

const PRESET_ANALYTICS_SINK_PATH = "/api/analytics/preset"
const WHATSAPP_ANALYTICS_SINK_PATH = "/api/analytics/whatsapp"
const SEARCH_ANALYTICS_SINK_PATH = "/api/analytics/search"
const RECOMMENDATION_ANALYTICS_SINK_PATH = "/api/analytics/recommendation"

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
    gtag?: (...args: any[]) => void
  }
}

const compactPayload = (payload: AnalyticsPayload) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  )
}

export const trackAnalyticsEvent = (
  eventName: string,
  payload: AnalyticsPayload
) => {
  if (typeof window === "undefined") {
    return
  }

  const compactedPayload = compactPayload(payload)
  const event = {
    event: eventName,
    ...compactedPayload,
    timestamp: new Date().toISOString(),
  }

  window.dispatchEvent(
    new CustomEvent("nexmart:analytics", {
      detail: event,
    })
  )

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event)
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, compactedPayload)
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event)
  }
}

const sendPresetAnalyticsToSink = (
  eventName: PresetAnalyticsEventName,
  payload: AnalyticsPayload
) => {
  if (typeof window === "undefined") {
    return
  }

  void fetch(PRESET_ANALYTICS_SINK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      event_name: eventName,
      payload,
    }),
  }).catch(() => {
    // Intentionally ignore transport failures; client analytics emitters already ran.
  })
}

const sendWhatsAppAnalyticsToSink = (
  eventName: WhatsAppAnalyticsEventName,
  payload: AnalyticsPayload
) => {
  if (typeof window === "undefined") {
    return
  }

  void fetch(WHATSAPP_ANALYTICS_SINK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      event_name: eventName,
      payload,
    }),
  }).catch(() => {
    // Intentionally ignore transport failures; client analytics emitters already ran.
  })
}

const sendSearchAnalyticsToSink = (
  eventName: "search_submitted" | "search_results_viewed",
  payload: AnalyticsPayload
) => {
  if (typeof window === "undefined") {
    return
  }

  void fetch(SEARCH_ANALYTICS_SINK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      event_name: eventName,
      payload,
    }),
  }).catch(() => {
    // Intentionally ignore transport failures; client analytics emitters already ran.
  })
}

const sendRecommendationAnalyticsToSink = (
  eventName: "recommendation_rail_viewed" | "recommendation_product_clicked",
  payload: AnalyticsPayload
) => {
  if (typeof window === "undefined") {
    return
  }

  void fetch(RECOMMENDATION_ANALYTICS_SINK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      event_name: eventName,
      payload,
    }),
  }).catch(() => {
    // Intentionally ignore transport failures; client analytics emitters already ran.
  })
}

const withOccurredAt = (payload: AnalyticsPayload) => {
  return {
    occurred_at: new Date().toISOString(),
    ...payload,
  }
}

export const trackPresetSelected = (payload: PresetSelectedPayload) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("preset_selected", eventPayload)
  sendPresetAnalyticsToSink("preset_selected", eventPayload)
}

export const trackPresetAddedToCart = (payload: PresetAddedToCartPayload) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("preset_added_to_cart", eventPayload)
  sendPresetAnalyticsToSink("preset_added_to_cart", eventPayload)
}

export const trackPresetPurchased = (payload: PresetPurchasedPayload) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("preset_purchased", eventPayload)
  sendPresetAnalyticsToSink("preset_purchased", eventPayload)
}

export const trackCheckoutStepChanged = (payload: {
  step: CheckoutStep
  previous_step?: CheckoutStep
}) => {
  trackAnalyticsEvent("checkout_step_changed", withOccurredAt(payload))
}

export const trackCheckoutBlockerShown = (payload: {
  step: CheckoutStep
  blocker_code: CheckoutBlockerCode
  payment_provider_id?: string
}) => {
  trackAnalyticsEvent("checkout_blocker_shown", withOccurredAt(payload))
}

export const trackCheckoutPlaceOrderAttempt = (payload: {
  payment_provider_id?: string
  currency_code?: string
  total?: number
}) => {
  trackAnalyticsEvent("checkout_place_order_attempt", withOccurredAt(payload))
}

export const trackCheckoutPlaceOrderFail = (payload: {
  payment_provider_id?: string
  blocker_code: CheckoutBlockerCode
  reason_message?: string
}) => {
  trackAnalyticsEvent("checkout_place_order_fail", withOccurredAt(payload))
}

export const trackCheckoutPlaceOrderSuccess = (payload: {
  order_id: string
  currency_code: string
  total?: number
}) => {
  trackAnalyticsEvent("checkout_place_order_success", withOccurredAt(payload))
}

export const trackSearchSubmitted = (payload: SearchAnalyticsPayload) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("search_submitted", eventPayload)
  sendSearchAnalyticsToSink("search_submitted", eventPayload)
}

export const trackSearchResultsViewed = (payload: SearchAnalyticsPayload) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("search_results_viewed", eventPayload)
  sendSearchAnalyticsToSink("search_results_viewed", eventPayload)
}

export const trackRecommendationRailViewed = (
  payload: RecommendationAnalyticsPayload
) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("recommendation_rail_viewed", eventPayload)
  sendRecommendationAnalyticsToSink("recommendation_rail_viewed", eventPayload)
}

export const trackRecommendationProductClicked = (
  payload: RecommendationAnalyticsPayload
) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("recommendation_product_clicked", eventPayload)
  sendRecommendationAnalyticsToSink("recommendation_product_clicked", eventPayload)
}

export const trackWhatsAppPreviewOpened = (payload: WhatsAppFunnelPayload) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("whatsapp_preview_opened", eventPayload)
  sendWhatsAppAnalyticsToSink("whatsapp_preview_opened", eventPayload)
}

export const trackWhatsAppMessageCopied = (payload: WhatsAppFunnelPayload) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("whatsapp_message_copied", eventPayload)
  sendWhatsAppAnalyticsToSink("whatsapp_message_copied", eventPayload)
}

export const trackWhatsAppContinueClicked = (
  payload: WhatsAppFunnelPayload
) => {
  const eventPayload = withOccurredAt(payload)
  trackAnalyticsEvent("whatsapp_continue_clicked", eventPayload)
  sendWhatsAppAnalyticsToSink("whatsapp_continue_clicked", eventPayload)
}
