import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureSearchAnalyticsTable,
  ensureSearchRecoveryOverrideTable,
  normalizeSearchQueryForAnalytics,
  normalizeSearchRecoveryScopeValue,
  SEARCH_ANALYTICS_TABLE,
  SEARCH_RECOVERY_OVERRIDE_TABLE,
} from "../../../../shared/search-analytics"

const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

const asString = (value: unknown, maxLength = 255) => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.replace(/\s+/g, " ").trim()

  return trimmed ? trimmed.slice(0, maxLength) : null
}

const buildOverrideScopeQuery = (
  builder: any,
  locale: string | null,
  countryCode: string | null
) => {
  if (locale) {
    builder.where("locale", locale)
  } else {
    builder.whereNull("locale")
  }

  if (countryCode) {
    builder.where("country_code", countryCode)
  } else {
    builder.whereNull("country_code")
  }
}

const listRecoveryOverrides = async (db: any, limit = 100) => {
  await ensureSearchRecoveryOverrideTable(db)

  const rows = await db(SEARCH_RECOVERY_OVERRIDE_TABLE)
    .select(
      "id",
      "query",
      "normalized_query",
      "target_query",
      "target_normalized_query",
      "locale",
      "country_code",
      "note",
      "created_at",
      "updated_at"
    )
    .orderBy("updated_at", "desc")
    .limit(limit)

  return rows.map((row: any) => ({
    id: toNumber(row.id),
    query: row.query,
    normalized_query: row.normalized_query,
    target_query: row.target_query,
    target_normalized_query: row.target_normalized_query,
    locale: row.locale,
    country_code: row.country_code,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  try {
    await ensureSearchAnalyticsTable(db)
    await ensureSearchRecoveryOverrideTable(db)

    const days = Math.max(1, parseInt(req.query.days as string) || 30)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20))

    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)

    const baseQuery = db(SEARCH_ANALYTICS_TABLE).whereBetween("occurred_at", [
      fromDate.toISOString(),
      toDate.toISOString(),
    ])

    const [
      totalsByEvent,
      resultSummary,
      topQueries,
      zeroResultQueries,
      recentQueries,
      recoveryOverrides,
      recoverySummary,
      recoveredQueries,
    ] = await Promise.all([
      baseQuery
        .clone()
        .select("event_name")
        .count({ events: "*" })
        .groupBy("event_name")
        .orderBy("events", "desc"),
      baseQuery
        .clone()
        .where("event_name", "search_results_viewed")
        .count({ result_views: "*" })
        .sum({
          zero_result_views: db.raw(
            "case when result_count = 0 then 1 else 0 end"
          ),
        })
        .avg({ average_results: "result_count" })
        .first(),
      baseQuery
        .clone()
        .select("normalized_query")
        .min({ query: "query" })
        .count({ events: "*" })
        .sum({
          submissions: db.raw(
            "case when event_name = 'search_submitted' then 1 else 0 end"
          ),
        })
        .sum({
          result_views: db.raw(
            "case when event_name = 'search_results_viewed' then 1 else 0 end"
          ),
        })
        .sum({
          zero_result_views: db.raw(
            "case when event_name = 'search_results_viewed' and result_count = 0 then 1 else 0 end"
          ),
        })
        .avg({ average_results: "result_count" })
        .max({ last_seen_at: "occurred_at" })
        .groupBy("normalized_query")
        .orderBy("events", "desc")
        .limit(limit),
      baseQuery
        .clone()
        .where("event_name", "search_results_viewed")
        .where("result_count", 0)
        .select("normalized_query")
        .min({ query: "query" })
        .count({ zero_result_views: "*" })
        .max({ last_seen_at: "occurred_at" })
        .groupBy("normalized_query")
        .orderBy("zero_result_views", "desc")
        .limit(limit),
      baseQuery
        .clone()
        .select(
          "event_name",
          "query",
          "source",
          "locale",
          "country_code",
          "result_count",
          "occurred_at"
        )
        .orderBy("occurred_at", "desc")
        .limit(limit),
      listRecoveryOverrides(db),
      baseQuery
        .clone()
        .where("event_name", "search_results_viewed")
        .where("source", "store_recovery")
        .count({ total_recovery_views: "*" })
        .sum({
          override_recovery_views: db.raw(
            "case when coalesce(payload->>'recovery_source', 'analytics') = 'override' then 1 else 0 end"
          ),
        })
        .sum({
          analytics_recovery_views: db.raw(
            "case when coalesce(payload->>'recovery_source', 'analytics') <> 'override' then 1 else 0 end"
          ),
        })
        .avg({ average_recovered_results: "result_count" })
        .first(),
      baseQuery
        .clone()
        .where("event_name", "search_results_viewed")
        .where("source", "store_recovery")
        .whereRaw("coalesce(payload->>'recovered_from_query', '') <> ''")
        .select(db.raw("payload->>'recovered_from_query' as original_query"))
        .select("normalized_query")
        .select(
          db.raw(
            "coalesce(payload->>'recovery_source', 'analytics') as recovery_source"
          )
        )
        .min({ recovered_query: "query" })
        .count({ recovery_views: "*" })
        .avg({ average_results: "result_count" })
        .max({ last_seen_at: "occurred_at" })
        .groupByRaw("payload->>'recovered_from_query'")
        .groupBy("normalized_query")
        .groupByRaw("coalesce(payload->>'recovery_source', 'analytics')")
        .orderBy("recovery_views", "desc")
        .limit(limit),
    ])

    const totalEvents = totalsByEvent.reduce(
      (sum: number, entry: any) => sum + toNumber(entry.events),
      0
    )
    const totalRecoveryViews = toNumber(recoverySummary?.total_recovery_views)
    const totalZeroResultViews = toNumber(resultSummary?.zero_result_views)

    return res.json({
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days,
      },
      summary: {
        total_events: totalEvents,
        total_submissions: toNumber(
          totalsByEvent.find((entry: any) => entry.event_name === "search_submitted")
            ?.events
        ),
        total_result_views: toNumber(resultSummary?.result_views),
        zero_result_views: totalZeroResultViews,
        average_results: toNumber(resultSummary?.average_results),
        total_recovery_views: totalRecoveryViews,
        recovery_view_rate: totalZeroResultViews
          ? (totalRecoveryViews / totalZeroResultViews) * 100
          : 0,
        average_recovered_results: toNumber(
          recoverySummary?.average_recovered_results
        ),
        override_recovery_views: toNumber(recoverySummary?.override_recovery_views),
        analytics_recovery_views: toNumber(
          recoverySummary?.analytics_recovery_views
        ),
      },
      events_by_type: totalsByEvent.map((entry: any) => ({
        event_name: entry.event_name,
        events: toNumber(entry.events),
      })),
      top_queries: topQueries.map((entry: any) => ({
        query: entry.query,
        normalized_query: entry.normalized_query,
        events: toNumber(entry.events),
        submissions: toNumber(entry.submissions),
        result_views: toNumber(entry.result_views),
        zero_result_views: toNumber(entry.zero_result_views),
        average_results: toNumber(entry.average_results),
        last_seen_at: entry.last_seen_at,
      })),
      zero_result_queries: zeroResultQueries.map((entry: any) => ({
        query: entry.query,
        normalized_query: entry.normalized_query,
        zero_result_views: toNumber(entry.zero_result_views),
        last_seen_at: entry.last_seen_at,
      })),
      recovered_queries: recoveredQueries.map((entry: any) => ({
        original_query: entry.original_query,
        recovered_query: entry.recovered_query,
        normalized_query: entry.normalized_query,
        recovery_source: entry.recovery_source,
        recovery_views: toNumber(entry.recovery_views),
        average_results: toNumber(entry.average_results),
        last_seen_at: entry.last_seen_at,
      })),
      recovery_overrides: recoveryOverrides,
      recent_queries: recentQueries.map((entry: any) => ({
        event_name: entry.event_name,
        query: entry.query,
        source: entry.source,
        locale: entry.locale,
        country_code: entry.country_code,
        result_count:
          entry.result_count === null || entry.result_count === undefined
            ? null
            : toNumber(entry.result_count),
        occurred_at: entry.occurred_at,
      })),
    })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to fetch search analytics", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to fetch analytics." })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const body = ((req.body ?? {}) as Record<string, unknown>) || {}

  try {
    await ensureSearchRecoveryOverrideTable(db)

    const query = asString(body.query)
    const targetQuery = asString(body.target_query)
    const locale = normalizeSearchRecoveryScopeValue(asString(body.locale, 16), 16)
    const countryCode = normalizeSearchRecoveryScopeValue(
      asString(body.country_code, 16),
      16
    )
    const note = asString(body.note, 512)

    if (!query || !targetQuery) {
      return res.status(400).json({
        message: "query and target_query are required.",
      })
    }

    const normalizedQuery = normalizeSearchQueryForAnalytics(query)
    const targetNormalizedQuery = normalizeSearchQueryForAnalytics(targetQuery)

    if (normalizedQuery === targetNormalizedQuery) {
      return res.status(400).json({
        message: "query and target_query must resolve to different normalized values.",
      })
    }

    const now = new Date().toISOString()
    const existing = await db(SEARCH_RECOVERY_OVERRIDE_TABLE)
      .where("normalized_query", normalizedQuery)
      .modify((builder: any) => buildOverrideScopeQuery(builder, locale, countryCode))
      .first()

    if (existing) {
      await db(SEARCH_RECOVERY_OVERRIDE_TABLE)
        .where("id", existing.id)
        .update({
          query,
          normalized_query: normalizedQuery,
          target_query: targetQuery,
          target_normalized_query: targetNormalizedQuery,
          locale,
          country_code: countryCode,
          note,
          updated_at: now,
        })
    } else {
      await db(SEARCH_RECOVERY_OVERRIDE_TABLE).insert({
        query,
        normalized_query: normalizedQuery,
        target_query: targetQuery,
        target_normalized_query: targetNormalizedQuery,
        locale,
        country_code: countryCode,
        note,
        created_at: now,
        updated_at: now,
      })
    }

    const [recoveryOverride] = await listRecoveryOverrides(db, 1)

    return res.status(existing ? 200 : 201).json({
      recovery_override: recoveryOverride,
    })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to upsert search recovery override", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to save recovery override." })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const id = toNumber(req.query.id)

  try {
    await ensureSearchRecoveryOverrideTable(db)

    if (!id) {
      return res.status(400).json({ message: "id is required." })
    }

    const deleted = await db(SEARCH_RECOVERY_OVERRIDE_TABLE).where("id", id).del()

    if (!deleted) {
      return res.status(404).json({ message: "Recovery override not found." })
    }

    return res.json({ id })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to delete search recovery override", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to delete recovery override." })
  }
}
