import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensurePresetAnalyticsTable,
  PRESET_ANALYTICS_TABLE,
} from "../../../../shared/preset-analytics"

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
    await ensurePresetAnalyticsTable(db)

    const days = Math.max(1, parseInt(req.query.days as string) || 30)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20))

    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)

    const baseQuery = db(PRESET_ANALYTICS_TABLE).whereBetween("occurred_at", [
      fromDate.toISOString(),
      toDate.toISOString(),
    ])

    const [totalsByEvent, topPresets, topProducts, purchasedPresets, revenueByProduct] =
      await Promise.all([
        baseQuery
          .clone()
          .select("event_name")
          .count({ events: "*" })
          .groupBy("event_name")
          .orderBy("events", "desc"),
        baseQuery
          .clone()
          .select("preset_key", "preset_title")
          .count({ events: "*" })
          .sum({ quantity: "quantity" })
          .groupBy("preset_key", "preset_title")
          .orderBy("events", "desc")
          .limit(limit),
        baseQuery
          .clone()
          .select("product_handle", "product_title")
          .count({ events: "*" })
          .sum({ quantity: "quantity" })
          .groupBy("product_handle", "product_title")
          .orderBy("events", "desc")
          .limit(limit),
        baseQuery
          .clone()
          .where("event_name", "preset_purchased")
          .select("preset_key", "preset_title")
          .count({ purchases: "*" })
          .sum({ purchased_quantity: "quantity" })
          .sum({ revenue: "amount" })
          .groupBy("preset_key", "preset_title")
          .orderBy("purchases", "desc")
          .limit(limit),
        baseQuery
          .clone()
          .where("event_name", "preset_purchased")
          .select("product_handle", "product_title")
          .count({ purchases: "*" })
          .sum({ revenue: "amount" })
          .groupBy("product_handle", "product_title")
          .orderBy("purchases", "desc")
          .limit(limit),
      ])

    const output = {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days,
      },
      summary: {
        total_events: totalsByEvent.reduce(
          (sum: number, e: any) => sum + toNumber(e.events),
          0
        ),
        total_selections: toNumber(
          totalsByEvent.find((e: any) => e.event_name === "preset_selected")?.events
        ),
        total_cart_adds: toNumber(
          totalsByEvent.find((e: any) => e.event_name === "preset_added_to_cart")?.events
        ),
        total_purchases: toNumber(
          totalsByEvent.find((e: any) => e.event_name === "preset_purchased")?.events
        ),
        total_revenue: purchasedPresets.reduce(
          (sum: number, p: any) => sum + toNumber(p.revenue),
          0
        ),
      },
      events_by_type: totalsByEvent.map((entry: any) => ({
        event_name: entry.event_name,
        events: toNumber(entry.events),
      })),
      top_presets: topPresets.map((entry: any) => ({
        preset_key: entry.preset_key,
        preset_title: entry.preset_title,
        events: toNumber(entry.events),
        quantity: toNumber(entry.quantity),
      })),
      top_products: topProducts.map((entry: any) => ({
        product_handle: entry.product_handle,
        product_title: entry.product_title,
        events: toNumber(entry.events),
        quantity: toNumber(entry.quantity),
      })),
      purchased_presets: purchasedPresets.map((entry: any) => ({
        preset_key: entry.preset_key,
        preset_title: entry.preset_title,
        purchases: toNumber(entry.purchases),
        purchased_quantity: toNumber(entry.purchased_quantity),
        revenue: toNumber(entry.revenue),
        average_value: toNumber(entry.revenue) / toNumber(entry.purchases),
      })),
      purchased_products: revenueByProduct.map((entry: any) => ({
        product_handle: entry.product_handle,
        product_title: entry.product_title,
        purchases: toNumber(entry.purchases),
        revenue: toNumber(entry.revenue),
        average_value: toNumber(entry.revenue) / toNumber(entry.purchases),
      })),
    }

    return res.json(output)
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to fetch preset analytics", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to fetch analytics." })
  }
}
