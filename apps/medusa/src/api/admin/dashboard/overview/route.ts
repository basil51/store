import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { resolveAccessControlContext } from "../../../../shared/access-control-context"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: {
      skip?: number
      take?: number
      order?: Record<string, "ASC" | "DESC">
    }
  }) => Promise<{
    data?: Array<Record<string, unknown>>
    metadata?: { count?: number }
  }>
}

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }
  const t = value.trim()
  return t.length ? t : null
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  if (value && typeof value === "object" && "toString" in value) {
    const n = Number(String(value))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const parseDays = (raw: unknown) => {
  const n = typeof raw === "string" ? parseInt(raw, 10) : typeof raw === "number" ? raw : NaN
  if (!Number.isFinite(n)) {
    return 30
  }
  return Math.min(365, Math.max(1, Math.floor(n)))
}

const CANCELED_STATUSES = new Set(["canceled", "cancelled", "archived"])

const isCanceledStatus = (status: string | null) =>
  status ? CANCELED_STATUSES.has(status.toLowerCase()) : false

/**
 * Non–super_admin users with store assignments only see orders on those stores'
 * default sales channels. Missing mapping yields an empty dashboard (safe default).
 */
const resolveScopedSalesChannelIds = async (
  req: MedusaRequest,
  query: QueryGraphLike
): Promise<{ restrict: boolean; salesChannelIds: string[] }> => {
  const { role, allowedStoreIds } = await resolveAccessControlContext(req)

  if (role === "super_admin") {
    return { restrict: false, salesChannelIds: [] }
  }

  if (!allowedStoreIds.length) {
    return { restrict: true, salesChannelIds: [] }
  }

  const { data } = await query.graph({
    entity: "store",
    fields: ["id", "default_sales_channel_id"],
    filters: { id: allowedStoreIds },
  })

  const salesChannelIds = (data ?? [])
    .map((row) => readString(row.default_sales_channel_id))
    .filter((id): id is string => Boolean(id))

  return { restrict: true, salesChannelIds: [...new Set(salesChannelIds)] }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const days = parseDays(req.query?.days)
  const limitTop = Math.min(
    50,
    Math.max(5, parseInt(String(req.query?.limit ?? "10"), 10) || 10)
  )

  const { restrict, salesChannelIds } = await resolveScopedSalesChannelIds(req, query)

  if (restrict && salesChannelIds.length === 0) {
    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)
    return res.status(200).json({
      range: { from: fromDate.toISOString(), to: toDate.toISOString(), days },
      summary: {
        order_count: 0,
        revenue_total: 0,
        currency_code: null as string | null,
        status_counts: {} as Record<string, number>,
      },
      recent_orders: [] as Array<{
        id: string
        display_id: number | null
        email: string | null
        created_at: string | null
        status: string | null
        currency_code: string | null
        total: number
      }>,
      top_products: [] as Array<{
        product_id: string | null
        title: string
        units_sold: number
        line_revenue: number
      }>,
      scope: { restricted: true, sales_channel_ids: salesChannelIds },
    })
  }

  const toDate = new Date()
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)
  const fromMs = fromDate.getTime()

  const orderFilters: Record<string, unknown> = {}
  if (restrict && salesChannelIds.length) {
    orderFilters.sales_channel_id = salesChannelIds
  }

  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "created_at",
      "status",
      "currency_code",
      "total",
      "sales_channel_id",
      "items.id",
      "items.title",
      "items.quantity",
      "items.product_id",
      "items.subtotal",
      "items.total",
    ],
    filters: Object.keys(orderFilters).length ? orderFilters : undefined,
    pagination: {
      skip: 0,
      take: 500,
      order: { created_at: "DESC" },
    },
  })

  const rows = orders ?? []
  const inRange = rows.filter((o) => {
    const created = readString(o.created_at)
    if (!created) {
      return false
    }
    const t = Date.parse(created)
    return Number.isFinite(t) && t >= fromMs && t <= toDate.getTime()
  })

  let primaryCurrency: string | null = null
  let orderCount = 0
  let revenueTotal = 0
  const statusCounts: Record<string, number> = {}

  for (const o of inRange) {
    const status = readString(o.status) ?? "unknown"
    statusCounts[status] = (statusCounts[status] ?? 0) + 1

    if (!isCanceledStatus(status)) {
      orderCount += 1
      const total = toNumber(o.total)
      revenueTotal += total
      if (!primaryCurrency) {
        primaryCurrency = readString(o.currency_code)
      }
    }
  }

  const recentSource = inRange.slice(0, 12)
  const recent_orders = recentSource.map((o) => ({
    id: readString(o.id) ?? "",
    display_id: typeof o.display_id === "number" ? o.display_id : toNumber(o.display_id) || null,
    email: readString(o.email),
    created_at: readString(o.created_at),
    status: readString(o.status),
    currency_code: readString(o.currency_code),
    total: toNumber(o.total),
  }))

  const productMap = new Map<
    string,
    { product_id: string | null; title: string; units_sold: number; line_revenue: number }
  >()

  for (const o of inRange) {
    const status = readString(o.status)
    if (isCanceledStatus(status)) {
      continue
    }
    const items = Array.isArray(o.items) ? o.items : []
    for (const item of items) {
      const qty = Math.max(0, toNumber((item as Record<string, unknown>).quantity))
      const lineTotal = toNumber((item as Record<string, unknown>).total)
      const subtotal = toNumber((item as Record<string, unknown>).subtotal)
      const lineRevenue = lineTotal > 0 ? lineTotal : subtotal
      const title = readString((item as Record<string, unknown>).title) ?? "Unknown item"
      const productId = readString((item as Record<string, unknown>).product_id)
      const key = productId ?? `title:${title}`
      const prev = productMap.get(key)
      if (prev) {
        prev.units_sold += qty
        prev.line_revenue += lineRevenue
      } else {
        productMap.set(key, {
          product_id: productId,
          title,
          units_sold: qty,
          line_revenue: lineRevenue,
        })
      }
    }
  }

  const top_products = [...productMap.values()]
    .sort((a, b) => b.line_revenue - a.line_revenue || b.units_sold - a.units_sold)
    .slice(0, limitTop)

  return res.status(200).json({
    range: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      days,
    },
    summary: {
      order_count: orderCount,
      revenue_total: revenueTotal,
      currency_code: primaryCurrency,
      status_counts: statusCounts,
    },
    recent_orders,
    top_products,
    scope: {
      restricted: restrict,
      sales_channel_ids: salesChannelIds,
    },
    fetched_order_count: rows.length,
    total_orders_hint: metadata?.count,
  })
}
