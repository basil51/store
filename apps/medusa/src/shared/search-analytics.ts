export const SEARCH_ANALYTICS_TABLE = "search_analytics_events"
export const SEARCH_RECOVERY_OVERRIDE_TABLE = "search_recovery_overrides"

export const SEARCH_ANALYTICS_EVENT_NAMES = [
  "search_submitted",
  "search_results_viewed",
] as const

export type SearchAnalyticsEventName =
  (typeof SEARCH_ANALYTICS_EVENT_NAMES)[number]

type SearchAnalyticsRequestContext = {
  requestHost?: string
  requestPath?: string
  userAgent?: string
  ipAddress?: string
}

export type NormalizedSearchAnalyticsEvent = {
  eventName: SearchAnalyticsEventName
  query: string
  normalizedQuery: string
  source?: string
  locale?: string
  countryCode?: string
  resultCount?: number
  occurredAt: Date
  payload: Record<string, unknown>
}

export type SearchRecoveryCandidate = {
  query: string
  normalizedQuery: string
  resultViews: number
  averageResults: number
  zeroResultViews?: number
}

export type RankedSearchRecoveryCandidate = SearchRecoveryCandidate & {
  score: number
}

export type SearchRecoveryOverride = {
  id?: number
  query: string
  normalizedQuery: string
  targetQuery: string
  targetNormalizedQuery: string
  locale?: string | null
  countryCode?: string | null
  note?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

const EVENT_NAME_SET = new Set<string>(SEARCH_ANALYTICS_EVENT_NAMES)

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

export const normalizeSearchQueryForAnalytics = (query: string) =>
  query.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 255)

export const normalizeSearchRecoveryScopeValue = (
  value?: string | null,
  maxLength = 16
) => {
  const normalized = value?.replace(/\s+/g, " ").trim().toLowerCase()

  return normalized ? normalized.slice(0, maxLength) : null
}

const normalizeSearchRecoveryString = (value?: string | null) =>
  normalizeSearchQueryForAnalytics(value ?? "").replace(/[-_]+/g, " ")

const buildTokenSet = (value: string) => new Set(value.split(" ").filter(Boolean))

const buildBigrams = (value: string) => {
  const compact = value.replace(/\s+/g, "")

  if (compact.length < 2) {
    return compact ? [compact] : []
  }

  const bigrams: string[] = []

  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.push(compact.slice(index, index + 2))
  }

  return bigrams
}

const getDiceCoefficient = (left: string, right: string) => {
  const leftBigrams = buildBigrams(left)
  const rightBigrams = buildBigrams(right)

  if (!leftBigrams.length || !rightBigrams.length) {
    return 0
  }

  const remaining = [...rightBigrams]
  let matches = 0

  for (const bigram of leftBigrams) {
    const matchIndex = remaining.indexOf(bigram)

    if (matchIndex >= 0) {
      matches += 1
      remaining.splice(matchIndex, 1)
    }
  }

  return (2 * matches) / (leftBigrams.length + rightBigrams.length)
}

const getTokenOverlapRatio = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) {
    return 0
  }

  let overlap = 0

  for (const token of left) {
    if (right.has(token)) {
      overlap += 1
    }
  }

  return overlap / Math.max(left.size, right.size)
}

export const scoreSearchRecoveryCandidate = (
  rawQuery: string,
  candidate: SearchRecoveryCandidate
) => {
  const normalizedQuery = normalizeSearchRecoveryString(rawQuery)
  const normalizedCandidate = normalizeSearchRecoveryString(candidate.normalizedQuery)

  if (!normalizedQuery || !normalizedCandidate || normalizedQuery === normalizedCandidate) {
    return 0
  }

  const queryTokens = buildTokenSet(normalizedQuery)
  const candidateTokens = buildTokenSet(normalizedCandidate)
  const tokenOverlap = getTokenOverlapRatio(queryTokens, candidateTokens)
  const diceCoefficient = getDiceCoefficient(normalizedQuery, normalizedCandidate)
  const containsBoost =
    normalizedCandidate.includes(normalizedQuery) || normalizedQuery.includes(normalizedCandidate)
      ? 0.14
      : 0
  const successBoost = Math.min(0.18, Math.log2(candidate.resultViews + 1) * 0.03)
  const resultDepthBoost = Math.min(0.1, candidate.averageResults * 0.01)
  const zeroResultPenalty = Math.min(0.08, (candidate.zeroResultViews ?? 0) * 0.01)

  const score = tokenOverlap * 0.52 + diceCoefficient * 0.34 + containsBoost + successBoost + resultDepthBoost - zeroResultPenalty

  return Number(score.toFixed(4))
}

export const rankSearchRecoveryCandidates = (
  rawQuery: string,
  candidates: SearchRecoveryCandidate[],
  limit = 3
) => {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreSearchRecoveryCandidate(rawQuery, candidate),
    }))
    .filter((candidate) => candidate.score >= 0.34)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      if (right.resultViews !== left.resultViews) {
        return right.resultViews - left.resultViews
      }

      return right.averageResults - left.averageResults
    })
    .slice(0, limit)
}

const getSearchRecoveryOverrideSpecificity = (
  override: SearchRecoveryOverride,
  scope?: {
    locale?: string | null
    countryCode?: string | null
  }
) => {
  const locale = normalizeSearchRecoveryScopeValue(scope?.locale)
  const countryCode = normalizeSearchRecoveryScopeValue(scope?.countryCode)
  const overrideLocale = normalizeSearchRecoveryScopeValue(override.locale)
  const overrideCountryCode = normalizeSearchRecoveryScopeValue(override.countryCode)

  if (overrideLocale && overrideLocale !== locale) {
    return -1
  }

  if (overrideCountryCode && overrideCountryCode !== countryCode) {
    return -1
  }

  return (overrideLocale ? 2 : 0) + (overrideCountryCode ? 2 : 0)
}

const getSearchRecoveryOverrideTimestamp = (value?: string | Date | null) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 0 : value.getTime()
  }

  if (typeof value === "string") {
    const parsed = new Date(value)

    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
  }

  return 0
}

export const selectSearchRecoveryOverride = (
  rawQuery: string,
  overrides: SearchRecoveryOverride[],
  scope?: {
    locale?: string | null
    countryCode?: string | null
  }
) => {
  const normalizedQuery = normalizeSearchQueryForAnalytics(rawQuery)

  return (
    overrides
      .filter((override) => override.normalizedQuery === normalizedQuery)
      .map((override) => ({
        override,
        specificity: getSearchRecoveryOverrideSpecificity(override, scope),
      }))
      .filter((entry) => entry.specificity >= 0)
      .sort((left, right) => {
        if (right.specificity !== left.specificity) {
          return right.specificity - left.specificity
        }

        return (
          getSearchRecoveryOverrideTimestamp(right.override.updatedAt) -
          getSearchRecoveryOverrideTimestamp(left.override.updatedAt)
        )
      })[0]?.override ?? null
  )
}

export const normalizeSearchAnalyticsEvent = (body: unknown) => {
  const envelope = asRecord(body)

  if (!envelope) {
    return {
      error: "Analytics event body must be a JSON object.",
    } as const
  }

  const eventName = asString(envelope.event_name, 64)

  if (!eventName || !EVENT_NAME_SET.has(eventName)) {
    return {
      error: "event_name must be one of: search_submitted, search_results_viewed.",
    } as const
  }

  const payload = asRecord(envelope.payload)

  if (!payload) {
    return {
      error: "payload must be a JSON object.",
    } as const
  }

  const query = asString(payload.query, 255)

  if (!query) {
    return {
      error: "payload.query is required.",
    } as const
  }

  const resultCount = asInteger(payload.result_count)

  if (resultCount != null && resultCount < 0) {
    return {
      error: "payload.result_count must be zero or greater when provided.",
    } as const
  }

  if (eventName === "search_results_viewed" && resultCount == null) {
    return {
      error: "payload.result_count is required for search_results_viewed.",
    } as const
  }

  return {
    value: {
      eventName: eventName as SearchAnalyticsEventName,
      query,
      normalizedQuery: normalizeSearchQueryForAnalytics(query),
      source: asString(payload.source, 64),
      locale: asString(payload.locale, 16),
      countryCode: asString(payload.country_code, 16),
      resultCount,
      occurredAt: asDate(payload.occurred_at) ?? new Date(),
      payload,
    } satisfies NormalizedSearchAnalyticsEvent,
  } as const
}

let tableReady = false
let tableSetupPromise: Promise<void> | null = null
let overrideTableReady = false
let overrideTableSetupPromise: Promise<void> | null = null

export const ensureSearchAnalyticsTable = async (db: any) => {
  if (tableReady) {
    return
  }

  if (!tableSetupPromise) {
    tableSetupPromise = (async () => {
      const hasTable = await db.schema.hasTable(SEARCH_ANALYTICS_TABLE)

      if (!hasTable) {
        await db.schema.createTable(SEARCH_ANALYTICS_TABLE, (table: any) => {
          table.bigIncrements("id").primary()
          table.string("event_name", 64).notNullable()
          table.string("query", 255).notNullable()
          table.string("normalized_query", 255).notNullable()
          table.string("source", 64).nullable()
          table.string("locale", 16).nullable()
          table.string("country_code", 16).nullable()
          table.integer("result_count").nullable()
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
            "idx_search_analytics_event_time"
          )
          table.index(
            ["normalized_query", "occurred_at"],
            "idx_search_analytics_query_time"
          )
          table.index(
            ["result_count", "occurred_at"],
            "idx_search_analytics_results_time"
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

export const ensureSearchRecoveryOverrideTable = async (db: any) => {
  if (overrideTableReady) {
    return
  }

  if (!overrideTableSetupPromise) {
    overrideTableSetupPromise = (async () => {
      const hasTable = await db.schema.hasTable(SEARCH_RECOVERY_OVERRIDE_TABLE)

      if (!hasTable) {
        await db.schema.createTable(SEARCH_RECOVERY_OVERRIDE_TABLE, (table: any) => {
          table.bigIncrements("id").primary()
          table.string("query", 255).notNullable()
          table.string("normalized_query", 255).notNullable()
          table.string("target_query", 255).notNullable()
          table.string("target_normalized_query", 255).notNullable()
          table.string("locale", 16).nullable()
          table.string("country_code", 16).nullable()
          table.string("note", 512).nullable()
          table
            .timestamp("created_at", { useTz: true })
            .notNullable()
            .defaultTo(db.fn.now())
          table
            .timestamp("updated_at", { useTz: true })
            .notNullable()
            .defaultTo(db.fn.now())

          table.index(["normalized_query"], "idx_search_recovery_override_query")
          table.index(["locale", "country_code"], "idx_search_recovery_override_scope")
        })
      }

      overrideTableReady = true
    })().catch((error) => {
      overrideTableSetupPromise = null
      throw error
    })
  }

  await overrideTableSetupPromise
}

export const insertSearchAnalyticsEvent = async (
  db: any,
  event: NormalizedSearchAnalyticsEvent,
  requestContext: SearchAnalyticsRequestContext
) => {
  await db(SEARCH_ANALYTICS_TABLE).insert({
    event_name: event.eventName,
    query: event.query,
    normalized_query: event.normalizedQuery,
    source: event.source,
    locale: event.locale,
    country_code: event.countryCode,
    result_count: event.resultCount,
    payload: event.payload,
    occurred_at: event.occurredAt,
    request_host: requestContext.requestHost,
    request_path: requestContext.requestPath,
    user_agent: requestContext.userAgent,
    ip_address: requestContext.ipAddress,
  })
}
