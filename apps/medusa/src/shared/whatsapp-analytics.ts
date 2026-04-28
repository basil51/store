export const WHATSAPP_ANALYTICS_TABLE = "whatsapp_analytics_events"

export const WHATSAPP_ANALYTICS_EVENT_NAMES = [
  "whatsapp_preview_opened",
  "whatsapp_message_copied",
  "whatsapp_continue_clicked",
] as const

export type WhatsAppAnalyticsEventName =
  (typeof WHATSAPP_ANALYTICS_EVENT_NAMES)[number]

type WhatsAppAnalyticsRequestContext = {
  requestHost?: string
  requestPath?: string
  userAgent?: string
  ipAddress?: string
}

export type NormalizedWhatsAppAnalyticsEvent = {
  eventName: WhatsAppAnalyticsEventName
  source: string
  locale?: string
  messageLength?: number
  currencyCode?: string
  quantity?: number
  total?: number
  cartId?: string
  itemCount?: number
  productId?: string
  productHandle?: string
  productTitle?: string
  variantId?: string
  presetKey?: string
  presetTitle?: string
  occurredAt: Date
  payload: Record<string, unknown>
}

const EVENT_NAME_SET = new Set<string>(WHATSAPP_ANALYTICS_EVENT_NAMES)

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

const asString = (value: unknown, maxLength = 255): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  return trimmed.slice(0, maxLength)
}

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

const asInteger = (value: unknown): number | undefined => {
  const parsed = asNumber(value)

  if (parsed == null || !Number.isInteger(parsed)) {
    return undefined
  }

  return parsed
}

const asDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  const valueAsString = asString(value, 128)

  if (!valueAsString) {
    return undefined
  }

  const parsed = new Date(valueAsString)

  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed
}

export const normalizeWhatsAppAnalyticsEvent = (body: unknown) => {
  const envelope = asRecord(body)

  if (!envelope) {
    return {
      error: "Analytics event body must be a JSON object.",
    } as const
  }

  const eventName = asString(envelope.event_name, 64)

  if (!eventName || !EVENT_NAME_SET.has(eventName)) {
    return {
      error:
        "event_name must be one of: whatsapp_preview_opened, whatsapp_message_copied, whatsapp_continue_clicked.",
    } as const
  }

  const payload = asRecord(envelope.payload)

  if (!payload) {
    return {
      error: "payload must be a JSON object.",
    } as const
  }

  const source = asString(payload.source, 64)

  if (!source) {
    return {
      error: "payload.source is required.",
    } as const
  }

  const quantity = asInteger(payload.quantity)
  const itemCount = asInteger(payload.item_count)
  const messageLength = asInteger(payload.message_length)

  if (quantity != null && quantity <= 0) {
    return {
      error: "payload.quantity must be a positive integer when provided.",
    } as const
  }

  if (itemCount != null && itemCount < 0) {
    return {
      error: "payload.item_count must be zero or greater when provided.",
    } as const
  }

  if (messageLength != null && messageLength < 0) {
    return {
      error: "payload.message_length must be zero or greater when provided.",
    } as const
  }

  return {
    value: {
      eventName: eventName as WhatsAppAnalyticsEventName,
      source,
      locale: asString(payload.locale, 16),
      messageLength,
      currencyCode: asString(payload.currency_code, 16),
      quantity,
      total: asNumber(payload.total),
      cartId: asString(payload.cart_id, 255),
      itemCount,
      productId: asString(payload.product_id, 255),
      productHandle: asString(payload.product_handle, 255),
      productTitle: asString(payload.product_title, 255),
      variantId: asString(payload.variant_id, 255),
      presetKey: asString(payload.preset_key, 255),
      presetTitle: asString(payload.preset_title, 255),
      occurredAt: asDate(payload.occurred_at) ?? new Date(),
      payload,
    } satisfies NormalizedWhatsAppAnalyticsEvent,
  } as const
}

let tableReady = false
let tableSetupPromise: Promise<void> | null = null

export const ensureWhatsAppAnalyticsTable = async (db: any) => {
  if (tableReady) {
    return
  }

  if (!tableSetupPromise) {
    tableSetupPromise = (async () => {
      const hasTable = await db.schema.hasTable(WHATSAPP_ANALYTICS_TABLE)

      if (!hasTable) {
        await db.schema.createTable(WHATSAPP_ANALYTICS_TABLE, (table: any) => {
          table.bigIncrements("id").primary()
          table.string("event_name", 64).notNullable()
          table.string("source", 64).notNullable()
          table.string("locale", 16).nullable()
          table.integer("message_length").nullable()
          table.string("currency_code", 16).nullable()
          table.integer("quantity").nullable()
          table.decimal("total", 20, 6).nullable()
          table.string("cart_id", 255).nullable()
          table.integer("item_count").nullable()
          table.string("product_id", 255).nullable()
          table.string("product_handle", 255).nullable()
          table.string("product_title", 255).nullable()
          table.string("variant_id", 255).nullable()
          table.string("preset_key", 255).nullable()
          table.string("preset_title", 255).nullable()
          table.jsonb("payload").notNullable()
          table.timestamp("occurred_at", { useTz: true }).notNullable()
          table
            .timestamp("received_at", { useTz: true })
            .notNullable()
            .defaultTo(db.fn.now())
          table.string("request_host", 255).nullable()
          table.string("request_path", 255).nullable()
          table.string("user_agent", 1024).nullable()
          table.string("ip_address", 128).nullable()

          table.index(
            ["event_name", "occurred_at"],
            "idx_whatsapp_analytics_event_time"
          )
          table.index(["source", "occurred_at"], "idx_whatsapp_analytics_source_time")
          table.index(["product_id", "occurred_at"], "idx_whatsapp_analytics_product_time")
          table.index(["cart_id", "occurred_at"], "idx_whatsapp_analytics_cart_time")
        })
      }

      tableReady = true
    })().catch((error) => {
      tableSetupPromise = null
      throw error
    })
  }

  await tableSetupPromise
}

export const insertWhatsAppAnalyticsEvent = async (
  db: any,
  event: NormalizedWhatsAppAnalyticsEvent,
  requestContext: WhatsAppAnalyticsRequestContext
) => {
  await db(WHATSAPP_ANALYTICS_TABLE).insert({
    event_name: event.eventName,
    source: event.source,
    locale: event.locale,
    message_length: event.messageLength,
    currency_code: event.currencyCode,
    quantity: event.quantity,
    total: event.total,
    cart_id: event.cartId,
    item_count: event.itemCount,
    product_id: event.productId,
    product_handle: event.productHandle,
    product_title: event.productTitle,
    variant_id: event.variantId,
    preset_key: event.presetKey,
    preset_title: event.presetTitle,
    payload: event.payload,
    occurred_at: event.occurredAt,
    request_host: requestContext.requestHost,
    request_path: requestContext.requestPath,
    user_agent: requestContext.userAgent,
    ip_address: requestContext.ipAddress,
  })
}