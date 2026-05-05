export const RECOMMENDATION_ANALYTICS_TABLE = "recommendation_analytics_events"

export const RECOMMENDATION_ANALYTICS_EVENT_NAMES = [
  "recommendation_rail_viewed",
  "recommendation_product_clicked",
] as const

export type RecommendationAnalyticsEventName =
  (typeof RECOMMENDATION_ANALYTICS_EVENT_NAMES)[number]

type RecommendationAnalyticsRequestContext = {
  requestHost?: string
  requestPath?: string
  userAgent?: string
  ipAddress?: string
}

export type NormalizedRecommendationAnalyticsEvent = {
  eventName: RecommendationAnalyticsEventName
  rail: string
  sourceProductId: string
  sourceProductHandle?: string
  sourceProductTitle?: string
  recommendedCount: number
  recommendedProductId?: string
  recommendedProductHandle?: string
  recommendedProductTitle?: string
  recommendationSlot?: number
  locale?: string
  countryCode?: string
  occurredAt: Date
  payload: Record<string, unknown>
}

const EVENT_NAME_SET = new Set<string>(RECOMMENDATION_ANALYTICS_EVENT_NAMES)

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

  const trimmed = value.replace(/\s+/g, " ").trim()

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

export const normalizeRecommendationAnalyticsEvent = (body: unknown) => {
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
        "event_name must be one of: recommendation_rail_viewed, recommendation_product_clicked.",
    } as const
  }

  const payload = asRecord(envelope.payload)

  if (!payload) {
    return {
      error: "payload must be a JSON object.",
    } as const
  }

  const rail = asString(payload.rail, 64)
  const sourceProductId = asString(payload.source_product_id, 255)
  const recommendedCount = asInteger(payload.recommended_count)

  if (!rail) {
    return {
      error: "payload.rail is required.",
    } as const
  }

  if (!sourceProductId) {
    return {
      error: "payload.source_product_id is required.",
    } as const
  }

  if (recommendedCount == null || recommendedCount < 1) {
    return {
      error: "payload.recommended_count must be greater than zero.",
    } as const
  }

  const recommendationSlot = asInteger(payload.recommendation_slot)

  if (recommendationSlot != null && recommendationSlot < 1) {
    return {
      error: "payload.recommendation_slot must be greater than zero when provided.",
    } as const
  }

  if (eventName === "recommendation_product_clicked") {
    if (!asString(payload.recommended_product_id, 255)) {
      return {
        error: "payload.recommended_product_id is required for recommendation_product_clicked.",
      } as const
    }

    if (recommendationSlot == null) {
      return {
        error: "payload.recommendation_slot is required for recommendation_product_clicked.",
      } as const
    }
  }

  return {
    value: {
      eventName: eventName as RecommendationAnalyticsEventName,
      rail,
      sourceProductId,
      sourceProductHandle: asString(payload.source_product_handle, 255),
      sourceProductTitle: asString(payload.source_product_title, 255),
      recommendedCount,
      recommendedProductId: asString(payload.recommended_product_id, 255),
      recommendedProductHandle: asString(payload.recommended_product_handle, 255),
      recommendedProductTitle: asString(payload.recommended_product_title, 255),
      recommendationSlot,
      locale: asString(payload.locale, 16),
      countryCode: asString(payload.country_code, 16),
      occurredAt: asDate(payload.occurred_at) ?? new Date(),
      payload,
    } satisfies NormalizedRecommendationAnalyticsEvent,
  } as const
}

let tableReady = false
let tableSetupPromise: Promise<void> | null = null

export const ensureRecommendationAnalyticsTable = async (db: any) => {
  if (tableReady) {
    return
  }

  if (!tableSetupPromise) {
    tableSetupPromise = (async () => {
      const hasTable = await db.schema.hasTable(RECOMMENDATION_ANALYTICS_TABLE)

      if (!hasTable) {
        await db.schema.createTable(RECOMMENDATION_ANALYTICS_TABLE, (table: any) => {
          table.bigIncrements("id").primary()
          table.string("event_name", 64).notNullable()
          table.string("rail", 64).notNullable()
          table.string("source_product_id", 255).notNullable()
          table.string("source_product_handle", 255).nullable()
          table.string("source_product_title", 255).nullable()
          table.integer("recommended_count").notNullable()
          table.string("recommended_product_id", 255).nullable()
          table.string("recommended_product_handle", 255).nullable()
          table.string("recommended_product_title", 255).nullable()
          table.integer("recommendation_slot").nullable()
          table.string("locale", 16).nullable()
          table.string("country_code", 16).nullable()
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
            "idx_recommendation_analytics_event_time"
          )
          table.index(
            ["source_product_id", "occurred_at"],
            "idx_recommendation_analytics_source_time"
          )
          table.index(
            ["recommended_product_id", "occurred_at"],
            "idx_recommendation_analytics_target_time"
          )
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

export const insertRecommendationAnalyticsEvent = async (
  db: any,
  event: NormalizedRecommendationAnalyticsEvent,
  requestContext: RecommendationAnalyticsRequestContext
) => {
  await db(RECOMMENDATION_ANALYTICS_TABLE).insert({
    event_name: event.eventName,
    rail: event.rail,
    source_product_id: event.sourceProductId,
    source_product_handle: event.sourceProductHandle,
    source_product_title: event.sourceProductTitle,
    recommended_count: event.recommendedCount,
    recommended_product_id: event.recommendedProductId,
    recommended_product_handle: event.recommendedProductHandle,
    recommended_product_title: event.recommendedProductTitle,
    recommendation_slot: event.recommendationSlot,
    locale: event.locale,
    country_code: event.countryCode,
    payload: event.payload,
    occurred_at: event.occurredAt,
    request_host: requestContext.requestHost,
    request_path: requestContext.requestPath,
    user_agent: requestContext.userAgent,
    ip_address: requestContext.ipAddress,
  })
}