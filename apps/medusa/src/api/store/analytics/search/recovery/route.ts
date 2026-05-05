import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureSearchAnalyticsTable,
  ensureSearchRecoveryOverrideTable,
  normalizeSearchQueryForAnalytics,
  selectSearchRecoveryOverride,
  rankSearchRecoveryCandidates,
  SEARCH_ANALYTICS_TABLE,
  SEARCH_RECOVERY_OVERRIDE_TABLE,
} from "../../../../../shared/search-analytics"

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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  try {
    await ensureSearchAnalyticsTable(db)
    await ensureSearchRecoveryOverrideTable(db)

    const rawQuery = String(req.query.q ?? "").trim()
    const normalizedQuery = normalizeSearchQueryForAnalytics(rawQuery)
    const locale = typeof req.query.locale === "string" ? req.query.locale.trim() : ""
    const countryCode =
      typeof req.query.country_code === "string" ? req.query.country_code.trim() : ""
    const limit = Math.max(1, Math.min(5, parseInt(req.query.limit as string) || 3))
    const days = Math.max(7, Math.min(180, parseInt(req.query.days as string) || 90))

    if (!normalizedQuery) {
      return res.status(400).json({ message: "q is required." })
    }

    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)

    const overrideRows = await db(SEARCH_RECOVERY_OVERRIDE_TABLE)
      .where("normalized_query", normalizedQuery)
      .modify((builder: any) => {
        builder.where((scopeBuilder: any) => {
          if (locale) {
            scopeBuilder.where("locale", locale).orWhereNull("locale")
          } else {
            scopeBuilder.whereNull("locale")
          }
        })

        builder.where((scopeBuilder: any) => {
          if (countryCode) {
            scopeBuilder.where("country_code", countryCode).orWhereNull("country_code")
          } else {
            scopeBuilder.whereNull("country_code")
          }
        })
      })
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

    const candidateQuery = db(SEARCH_ANALYTICS_TABLE)
      .whereBetween("occurred_at", [fromDate.toISOString(), toDate.toISOString()])
      .where("event_name", "search_results_viewed")
      .whereNot("normalized_query", normalizedQuery)
      .where("result_count", ">", 0)
      .modify((builder: any) => {
        if (locale) {
          builder.where("locale", locale)
        }

        if (countryCode) {
          builder.where("country_code", countryCode)
        }
      })
      .select("normalized_query")
      .min({ query: "query" })
      .count({ result_views: "*" })
      .avg({ average_results: "result_count" })
      .sum({
        zero_result_views: db.raw(
          "case when result_count = 0 then 1 else 0 end"
        ),
      })
      .groupBy("normalized_query")
      .orderBy("result_views", "desc")
      .limit(150)

    const candidateRows = await candidateQuery

    const override = selectSearchRecoveryOverride(
      normalizedQuery,
      overrideRows.map((row: any) => ({
        id: toNumber(row.id),
        query: row.query,
        normalizedQuery: row.normalized_query,
        targetQuery: row.target_query,
        targetNormalizedQuery: row.target_normalized_query,
        locale: row.locale,
        countryCode: row.country_code,
        note: row.note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      {
        locale,
        countryCode,
      }
    )

    const analyticsCandidates = rankSearchRecoveryCandidates(
      normalizedQuery,
      candidateRows.map((row: any) => ({
        query: row.query,
        normalizedQuery: row.normalized_query,
        resultViews: toNumber(row.result_views),
        averageResults: toNumber(row.average_results),
        zeroResultViews: toNumber(row.zero_result_views),
      })),
      limit
    )

    const recoveryCandidates = [
      ...(override
        ? [
            {
              query: override.targetQuery,
              normalizedQuery: override.targetNormalizedQuery,
              score: 1,
              resultViews: 0,
              averageResults: 0,
              source: "override" as const,
            },
          ]
        : []),
      ...analyticsCandidates
        .filter(
          (candidate) =>
            candidate.normalizedQuery !== override?.targetNormalizedQuery
        )
        .map((candidate) => ({
          ...candidate,
          source: "analytics" as const,
        })),
    ].slice(0, limit)

    return res.json({
      query: rawQuery,
      normalized_query: normalizedQuery,
      recovery_queries: recoveryCandidates.map((candidate) => ({
        query: candidate.query,
        normalized_query: candidate.normalizedQuery,
        score: candidate.score,
        result_views: candidate.resultViews,
        average_results: candidate.averageResults,
        source: candidate.source,
      })),
    })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to fetch search recovery candidates", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to fetch search recovery." })
  }
}