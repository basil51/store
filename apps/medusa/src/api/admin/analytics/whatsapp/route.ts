import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureWhatsAppAnalyticsTable,
  WHATSAPP_ANALYTICS_TABLE,
} from "../../../../shared/whatsapp-analytics"

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000

type TimelineBucket = {
  day: string
  total_events: number
  total_preview_opens: number
  total_message_copies: number
  total_continue_clicks: number
}

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

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number }
) => {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  const resolved = Number.isFinite(parsed) ? parsed : fallback

  const min = options?.min ?? Number.MIN_SAFE_INTEGER
  const max = options?.max ?? Number.MAX_SAFE_INTEGER

  return Math.max(min, Math.min(max, resolved))
}

const parseOptionalFilter = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()

  if (!trimmed || trimmed.toLowerCase() === "all") {
    return undefined
  }

  return trimmed
}

const parseDateInput = (value: unknown, endOfDay = false) => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number)

    return endOfDay
      ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
      : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed
}

const startOfUtcDay = (date: Date) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  )
}

const endOfUtcDay = (date: Date) => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  )
}

const formatDayKey = (date: Date) => startOfUtcDay(date).toISOString().slice(0, 10)

const resolveRange = (query: MedusaRequest["query"]) => {
  const fallbackDays = parsePositiveInteger(query.days, 30, { min: 1, max: 365 })
  const parsedFrom = parseDateInput(query.from)
  const parsedTo = parseDateInput(query.to, true)

  if (parsedFrom || parsedTo) {
    const fromDate = startOfUtcDay(parsedFrom ?? new Date((parsedTo ?? new Date()).getTime() - (fallbackDays - 1) * MILLISECONDS_IN_DAY))
    const toDate = endOfUtcDay(parsedTo ?? new Date())

    if (fromDate.getTime() <= toDate.getTime()) {
      const days = Math.max(
        1,
        Math.round((startOfUtcDay(toDate).getTime() - startOfUtcDay(fromDate).getTime()) / MILLISECONDS_IN_DAY) + 1
      )

      return { fromDate, toDate, days }
    }

    const swappedFrom = startOfUtcDay(parsedTo ?? new Date())
    const swappedTo = endOfUtcDay(parsedFrom ?? new Date())
    const days = Math.max(
      1,
      Math.round((startOfUtcDay(swappedTo).getTime() - startOfUtcDay(swappedFrom).getTime()) / MILLISECONDS_IN_DAY) + 1
    )

    return { fromDate: swappedFrom, toDate: swappedTo, days }
  }

  const toDate = endOfUtcDay(new Date())
  const fromDate = startOfUtcDay(
    new Date(toDate.getTime() - (fallbackDays - 1) * MILLISECONDS_IN_DAY)
  )

  return {
    fromDate,
    toDate,
    days: fallbackDays,
  }
}

const buildTimelineBuckets = (fromDate: Date, toDate: Date) => {
  const buckets: TimelineBucket[] = []
  const cursor = startOfUtcDay(fromDate)
  const end = startOfUtcDay(toDate)

  while (cursor.getTime() <= end.getTime()) {
    buckets.push({
      day: formatDayKey(cursor),
      total_events: 0,
      total_preview_opens: 0,
      total_message_copies: 0,
      total_continue_clicks: 0,
    })

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return buckets
}

const applyEqualityFilter = (query: any, column: string, value?: string) => {
  if (!value) {
    return query
  }

  return query.where(column, value)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  try {
    await ensureWhatsAppAnalyticsTable(db)

    const limit = parsePositiveInteger(req.query.limit, 20, { min: 1, max: 100 })
    const { fromDate, toDate, days } = resolveRange(req.query)
    const sourceFilter = parseOptionalFilter(req.query.source)
    const localeFilter = parseOptionalFilter(req.query.locale)
    const eventNameFilter = parseOptionalFilter(req.query.event_name)

    const rangeQuery = db(WHATSAPP_ANALYTICS_TABLE).whereBetween("occurred_at", [
      fromDate.toISOString(),
      toDate.toISOString(),
    ])

    const baseQuery = applyEqualityFilter(
      applyEqualityFilter(
        applyEqualityFilter(rangeQuery.clone(), "source", sourceFilter),
        "locale",
        localeFilter
      ),
      "event_name",
      eventNameFilter
    )

    const [
      totalsByEvent,
      totalsBySource,
      totalsByLocale,
      topProducts,
      topPresets,
      availableEvents,
      availableSources,
      availableLocales,
      timelineRows,
    ] = await Promise.all([
        baseQuery
          .clone()
          .select("event_name")
          .count({ events: "*" })
          .groupBy("event_name")
          .orderBy("events", "desc"),
        baseQuery
          .clone()
          .select("source")
          .count({ events: "*" })
          .groupBy("source")
          .orderBy("events", "desc"),
        baseQuery
          .clone()
          .whereNotNull("locale")
          .select("locale")
          .count({ events: "*" })
          .groupBy("locale")
          .orderBy("events", "desc"),
        baseQuery
          .clone()
          .whereNotNull("product_id")
          .select("product_id", "product_handle", "product_title")
          .count({ events: "*" })
          .sum({ quantity: "quantity" })
          .groupBy("product_id", "product_handle", "product_title")
          .orderBy("events", "desc")
          .limit(limit),
        baseQuery
          .clone()
          .whereNotNull("preset_key")
          .select("preset_key", "preset_title")
          .count({ events: "*" })
          .sum({ quantity: "quantity" })
          .groupBy("preset_key", "preset_title")
          .orderBy("events", "desc")
          .limit(limit),
        rangeQuery
          .clone()
          .select("event_name")
          .count({ events: "*" })
          .groupBy("event_name")
          .orderBy("events", "desc"),
        rangeQuery
          .clone()
          .select("source")
          .count({ events: "*" })
          .groupBy("source")
          .orderBy("events", "desc"),
        rangeQuery
          .clone()
          .whereNotNull("locale")
          .select("locale")
          .count({ events: "*" })
          .groupBy("locale")
          .orderBy("events", "desc"),
        baseQuery
          .clone()
          .select(db.raw("DATE_TRUNC('day', occurred_at) as day"), "event_name")
          .count({ events: "*" })
          .groupByRaw("DATE_TRUNC('day', occurred_at), event_name")
          .groupBy("event_name")
          .orderBy("day", "asc"),
      ])

    const totalEvents = totalsByEvent.reduce(
      (sum: number, entry: any) => sum + toNumber(entry.events),
      0
    )
    const totalPreviewOpens = toNumber(
      totalsByEvent.find((entry: any) => entry.event_name === "whatsapp_preview_opened")
        ?.events
    )
    const totalMessageCopies = toNumber(
      totalsByEvent.find((entry: any) => entry.event_name === "whatsapp_message_copied")
        ?.events
    )
    const totalContinueClicks = toNumber(
      totalsByEvent.find((entry: any) => entry.event_name === "whatsapp_continue_clicked")
        ?.events
    )

    const totals = await baseQuery
      .clone()
      .select(
        db.raw("AVG(message_length) as average_message_length"),
        db.raw("AVG(quantity) as average_quantity"),
        db.raw("AVG(item_count) as average_item_count"),
        db.raw("AVG(total) as average_total")
      )
      .first()

    const timeline = buildTimelineBuckets(fromDate, toDate)
    const timelineByDay = new Map(timeline.map((entry) => [entry.day, entry]))

    for (const row of timelineRows) {
      const dayKey = formatDayKey(new Date(row.day))
      const bucket = timelineByDay.get(dayKey)

      if (!bucket) {
        continue
      }

      const events = toNumber(row.events)

      bucket.total_events += events

      if (row.event_name === "whatsapp_preview_opened") {
        bucket.total_preview_opens += events
      }

      if (row.event_name === "whatsapp_message_copied") {
        bucket.total_message_copies += events
      }

      if (row.event_name === "whatsapp_continue_clicked") {
        bucket.total_continue_clicks += events
      }
    }

    return res.json({
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days,
      },
      summary: {
        total_events: totalEvents,
        total_preview_opens: totalPreviewOpens,
        total_message_copies: totalMessageCopies,
        total_continue_clicks: totalContinueClicks,
        preview_to_copy_rate:
          totalPreviewOpens > 0 ? totalMessageCopies / totalPreviewOpens : 0,
        preview_to_continue_rate:
          totalPreviewOpens > 0 ? totalContinueClicks / totalPreviewOpens : 0,
        average_message_length: toNumber(totals?.average_message_length),
        average_quantity: toNumber(totals?.average_quantity),
        average_item_count: toNumber(totals?.average_item_count),
        average_total: toNumber(totals?.average_total),
      },
      filters: {
        source: sourceFilter ?? null,
        locale: localeFilter ?? null,
        event_name: eventNameFilter ?? null,
      },
      events_by_type: totalsByEvent.map((entry: any) => ({
        event_name: entry.event_name,
        events: toNumber(entry.events),
      })),
      sources: totalsBySource.map((entry: any) => ({
        source: entry.source,
        events: toNumber(entry.events),
      })),
      locales: totalsByLocale.map((entry: any) => ({
        locale: entry.locale,
        events: toNumber(entry.events),
      })),
      top_products: topProducts.map((entry: any) => ({
        product_id: entry.product_id,
        product_handle: entry.product_handle,
        product_title: entry.product_title,
        events: toNumber(entry.events),
        quantity: toNumber(entry.quantity),
      })),
      top_presets: topPresets.map((entry: any) => ({
        preset_key: entry.preset_key,
        preset_title: entry.preset_title,
        events: toNumber(entry.events),
        quantity: toNumber(entry.quantity),
      })),
      available_events: availableEvents.map((entry: any) => ({
        event_name: entry.event_name,
        events: toNumber(entry.events),
      })),
      available_sources: availableSources.map((entry: any) => ({
        source: entry.source,
        events: toNumber(entry.events),
      })),
      available_locales: availableLocales.map((entry: any) => ({
        locale: entry.locale,
        events: toNumber(entry.events),
      })),
      timeline,
    })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error?: (message: string, meta?: unknown) => void
    }

    logger.error?.("Failed to fetch WhatsApp analytics", {
      message: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({ message: "Failed to fetch analytics." })
  }
}