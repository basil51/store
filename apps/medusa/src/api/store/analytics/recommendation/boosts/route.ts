import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureRecommendationAnalyticsTable,
  RECOMMENDATION_ANALYTICS_TABLE,
} from "../../../../../shared/recommendation-analytics"

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

const parseProductIds = (value: unknown) => {
  if (typeof value !== "string") {
    return [] as string[]
  }

  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 24)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  try {
    await ensureRecommendationAnalyticsTable(db)

    const sourceProductId = String(req.query.source_product_id ?? "").trim()
    const recommendedProductIds = parseProductIds(req.query.product_ids)
    const days = Math.max(1, Math.min(90, parseInt(req.query.days as string) || 30))

    if (!sourceProductId) {
      return res.status(400).json({ message: "source_product_id is required." })
    }

    if (!recommendedProductIds.length) {
      return res.json({
        source_product_id: sourceProductId,
        rail_views: 0,
        products: [],
      })
    }

    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)

    const baseQuery = db(RECOMMENDATION_ANALYTICS_TABLE)
      .whereBetween("occurred_at", [fromDate.toISOString(), toDate.toISOString()])
      .where("rail", "related_products")
      .where("source_product_id", sourceProductId)

    const [railViewsRow, clickedProducts] = await Promise.all([
      baseQuery
        .clone()
        .where("event_name", "recommendation_rail_viewed")
        .count({ rail_views: "*" })
        .first(),
      baseQuery
        .clone()
        .where("event_name", "recommendation_product_clicked")
        .whereIn("recommended_product_id", recommendedProductIds)
        .select("recommended_product_id")
        .count({ clicks: "*" })
        .groupBy("recommended_product_id")
        .orderBy("clicks", "desc"),
    ])

    const railViews = toNumber(railViewsRow?.rail_views)
    const clickMap = new Map(
      clickedProducts.map((entry: any) => [
        entry.recommended_product_id,
        toNumber(entry.clicks),
      ])
    )

    return res.json({
      source_product_id: sourceProductId,
      rail_views: railViews,
      products: recommendedProductIds.map((recommendedProductId) => {
        const clicks = clickMap.get(recommendedProductId) ?? 0

        return {
          recommended_product_id: recommendedProductId,
          clicks,
          click_through_rate: railViews ? clicks / railViews : 0,
        }
      }),
    })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to fetch recommendation analytics boosts", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to fetch recommendation boosts." })
  }
}