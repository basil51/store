import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureRecommendationAnalyticsTable,
  RECOMMENDATION_ANALYTICS_TABLE,
} from "../../../../shared/recommendation-analytics"

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
    await ensureRecommendationAnalyticsTable(db)

    const days = Math.max(1, parseInt(req.query.days as string) || 30)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20))

    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)

    const baseQuery = db(RECOMMENDATION_ANALYTICS_TABLE).whereBetween("occurred_at", [
      fromDate.toISOString(),
      toDate.toISOString(),
    ])

    const [totalsByEvent, railSummary, topSourceProducts, topClickedProducts, recentEvents] =
      await Promise.all([
        baseQuery
          .clone()
          .select("event_name")
          .count({ events: "*" })
          .groupBy("event_name")
          .orderBy("events", "desc"),
        baseQuery
          .clone()
          .select("rail")
          .count({ events: "*" })
          .groupBy("rail")
          .orderBy("events", "desc"),
        baseQuery
          .clone()
          .select("source_product_id")
          .min({ source_product_handle: "source_product_handle" })
          .min({ source_product_title: "source_product_title" })
          .count({ events: "*" })
          .sum({
            rail_views: db.raw(
              "case when event_name = 'recommendation_rail_viewed' then 1 else 0 end"
            ),
          })
          .sum({
            product_clicks: db.raw(
              "case when event_name = 'recommendation_product_clicked' then 1 else 0 end"
            ),
          })
          .avg({ average_recommended_count: "recommended_count" })
          .max({ last_seen_at: "occurred_at" })
          .groupBy("source_product_id")
          .orderBy("events", "desc")
          .limit(limit),
        baseQuery
          .clone()
          .where("event_name", "recommendation_product_clicked")
          .whereNotNull("recommended_product_id")
          .select("recommended_product_id")
          .min({ recommended_product_handle: "recommended_product_handle" })
          .min({ recommended_product_title: "recommended_product_title" })
          .count({ clicks: "*" })
          .avg({ average_slot: "recommendation_slot" })
          .max({ last_clicked_at: "occurred_at" })
          .groupBy("recommended_product_id")
          .orderBy("clicks", "desc")
          .limit(limit),
        baseQuery
          .clone()
          .select(
            "event_name",
            "rail",
            "source_product_id",
            "source_product_handle",
            "source_product_title",
            "recommended_product_id",
            "recommended_product_handle",
            "recommended_product_title",
            "recommendation_slot",
            "recommended_count",
            "locale",
            "country_code",
            "occurred_at"
          )
          .orderBy("occurred_at", "desc")
          .limit(limit),
      ])

    const totalEvents = totalsByEvent.reduce(
      (sum: number, entry: any) => sum + toNumber(entry.events),
      0
    )
    const totalRailViews = toNumber(
      totalsByEvent.find((entry: any) => entry.event_name === "recommendation_rail_viewed")
        ?.events
    )
    const totalProductClicks = toNumber(
      totalsByEvent.find(
        (entry: any) => entry.event_name === "recommendation_product_clicked"
      )?.events
    )

    return res.json({
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days,
      },
      summary: {
        total_events: totalEvents,
        total_rail_views: totalRailViews,
        total_product_clicks: totalProductClicks,
        click_through_rate: totalRailViews
          ? (totalProductClicks / totalRailViews) * 100
          : 0,
      },
      rails: railSummary.map((entry: any) => ({
        rail: entry.rail,
        events: toNumber(entry.events),
      })),
      top_source_products: topSourceProducts.map((entry: any) => ({
        source_product_id: entry.source_product_id,
        source_product_handle: entry.source_product_handle,
        source_product_title: entry.source_product_title,
        events: toNumber(entry.events),
        rail_views: toNumber(entry.rail_views),
        product_clicks: toNumber(entry.product_clicks),
        average_recommended_count: toNumber(entry.average_recommended_count),
        last_seen_at: entry.last_seen_at,
      })),
      top_clicked_products: topClickedProducts.map((entry: any) => ({
        recommended_product_id: entry.recommended_product_id,
        recommended_product_handle: entry.recommended_product_handle,
        recommended_product_title: entry.recommended_product_title,
        clicks: toNumber(entry.clicks),
        average_slot: toNumber(entry.average_slot),
        last_clicked_at: entry.last_clicked_at,
      })),
      recent_events: recentEvents.map((entry: any) => ({
        event_name: entry.event_name,
        rail: entry.rail,
        source_product_id: entry.source_product_id,
        source_product_handle: entry.source_product_handle,
        source_product_title: entry.source_product_title,
        recommended_product_id: entry.recommended_product_id,
        recommended_product_handle: entry.recommended_product_handle,
        recommended_product_title: entry.recommended_product_title,
        recommendation_slot:
          entry.recommendation_slot === null || entry.recommendation_slot === undefined
            ? null
            : toNumber(entry.recommendation_slot),
        recommended_count: toNumber(entry.recommended_count),
        locale: entry.locale,
        country_code: entry.country_code,
        occurred_at: entry.occurred_at,
      })),
    })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to fetch recommendation analytics", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to fetch analytics." })
  }
}