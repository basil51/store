export const PRESET_ANALYTICS_TABLE = "preset_analytics_events"

export const PRESET_ANALYTICS_EVENT_NAMES = [
  "preset_selected",
  "preset_added_to_cart",
  "preset_purchased",
] as const

export type PresetAnalyticsEventName =
  (typeof PRESET_ANALYTICS_EVENT_NAMES)[number]

type PresetAnalyticsRequestContext = {
  requestHost?: string
  requestPath?: string
  userAgent?: string
  ipAddress?: string
}

export type NormalizedPresetAnalyticsEvent = {
  eventName: PresetAnalyticsEventName
  presetKey: string
  presetTitle: string
  presetBadge?: string
  presetIsDefault?: boolean
  source?: string
  productId?: string
  productHandle?: string
  productTitle?: string
  variantId?: string
  orderId?: string
  lineItemId?: string
  quantity?: number
  currencyCode?: string
  amount?: number
  optionValues?: Record<string, string>
  occurredAt: Date
  payload: Record<string, unknown>
}

const EVENT_NAME_SET = new Set<string>(PRESET_ANALYTICS_EVENT_NAMES)

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

const asBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value
  }

  return undefined
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

  if (parsed == null) {
    return undefined
  }

  if (!Number.isInteger(parsed)) {
    return undefined
  }

  return parsed
}

const asDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  const asDateString = asString(value, 128)

  if (!asDateString) {
    return undefined
  }

  const parsed = new Date(asDateString)

  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed
}

const asStringMap = (value: unknown): Record<string, string> | undefined => {
  const record = asRecord(value)

  if (!record) {
    return undefined
  }

  const normalized = Object.entries(record).reduce<Record<string, string>>(
    (acc, [key, currentValue]) => {
      const normalizedKey = asString(key, 255)
      const normalizedValue = asString(currentValue, 255)

      if (normalizedKey && normalizedValue) {
        acc[normalizedKey] = normalizedValue
      }

      return acc
    },
    {}
  )

  if (!Object.keys(normalized).length) {
    return undefined
  }

  return normalized
}

export const normalizePresetAnalyticsEvent = (body: unknown) => {
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
        "event_name must be one of: preset_selected, preset_added_to_cart, preset_purchased.",
    } as const
  }

  const payload = asRecord(envelope.payload)

  if (!payload) {
    return {
      error: "payload must be a JSON object.",
    } as const
  }

  const presetKey = asString(payload.preset_key, 255)
  const presetTitle = asString(payload.preset_title, 255)

  if (!presetKey || !presetTitle) {
    return {
      error: "payload.preset_key and payload.preset_title are required.",
    } as const
  }

  const quantity = asInteger(payload.quantity)

  if (
    (eventName === "preset_added_to_cart" || eventName === "preset_purchased") &&
    (!quantity || quantity <= 0)
  ) {
    return {
      error: "payload.quantity must be a positive integer for cart/purchase events.",
    } as const
  }

  const orderId = asString(payload.order_id, 255)
  const lineItemId = asString(payload.line_item_id, 255)

  if (eventName === "preset_purchased" && (!orderId || !lineItemId)) {
    return {
      error: "payload.order_id and payload.line_item_id are required for purchase events.",
    } as const
  }

  const amountCandidate =
    eventName === "preset_purchased"
      ? payload.line_total ?? payload.amount
      : payload.amount

  const normalized: NormalizedPresetAnalyticsEvent = {
    eventName: eventName as PresetAnalyticsEventName,
    presetKey,
    presetTitle,
    presetBadge: asString(payload.preset_badge, 255),
    presetIsDefault: asBoolean(payload.preset_is_default),
    source: asString(payload.source, 64),
    productId: asString(payload.product_id, 255),
    productHandle: asString(payload.product_handle, 255),
    productTitle: asString(payload.product_title, 255),
    variantId: asString(payload.variant_id, 255),
    orderId,
    lineItemId,
    quantity,
    currencyCode: asString(payload.currency_code, 16),
    amount: asNumber(amountCandidate),
    optionValues: asStringMap(payload.option_values),
    occurredAt: asDate(payload.occurred_at) ?? new Date(),
    payload,
  }

  return {
    value: normalized,
  } as const
}

let tableReady = false
let tableSetupPromise: Promise<void> | null = null

export const ensurePresetAnalyticsTable = async (db: any) => {
  if (tableReady) {
    return
  }

  if (!tableSetupPromise) {
    tableSetupPromise = (async () => {
      const hasTable = await db.schema.hasTable(PRESET_ANALYTICS_TABLE)

      if (!hasTable) {
        await db.schema.createTable(PRESET_ANALYTICS_TABLE, (table: any) => {
          table.bigIncrements("id").primary()
          table.string("event_name", 64).notNullable()
          table.string("preset_key", 255).notNullable()
          table.string("preset_title", 255).notNullable()
          table.string("preset_badge", 255).nullable()
          table.boolean("preset_is_default").nullable()
          table.string("source", 64).nullable()
          table.string("product_id", 255).nullable()
          table.string("product_handle", 255).nullable()
          table.string("product_title", 255).nullable()
          table.string("variant_id", 255).nullable()
          table.string("order_id", 255).nullable()
          table.string("line_item_id", 255).nullable()
          table.integer("quantity").nullable()
          table.string("currency_code", 16).nullable()
          table.decimal("amount", 20, 6).nullable()
          table.jsonb("option_values").nullable()
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
            "idx_preset_analytics_event_time"
          )
          table.index(["preset_key", "occurred_at"], "idx_preset_analytics_preset_time")
          table.index(["order_id", "line_item_id"], "idx_preset_analytics_order_line")
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

export const insertPresetAnalyticsEvent = async (
  db: any,
  event: NormalizedPresetAnalyticsEvent,
  requestContext: PresetAnalyticsRequestContext
) => {
  await db(PRESET_ANALYTICS_TABLE).insert({
    event_name: event.eventName,
    preset_key: event.presetKey,
    preset_title: event.presetTitle,
    preset_badge: event.presetBadge,
    preset_is_default: event.presetIsDefault,
    source: event.source,
    product_id: event.productId,
    product_handle: event.productHandle,
    product_title: event.productTitle,
    variant_id: event.variantId,
    order_id: event.orderId,
    line_item_id: event.lineItemId,
    quantity: event.quantity,
    currency_code: event.currencyCode,
    amount: event.amount,
    option_values: event.optionValues,
    payload: event.payload,
    occurred_at: event.occurredAt,
    request_host: requestContext.requestHost,
    request_path: requestContext.requestPath,
    user_agent: requestContext.userAgent,
    ip_address: requestContext.ipAddress,
  })
}
