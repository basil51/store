import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

import {
  AdminRouteAccessNotice,
  useAdminRouteAccess,
} from "../../lib/admin-route-access"

const WHATSAPP_ANALYTICS_REQUIRED_PERMISSIONS = ["analytics.read"] as const

const AnalyticsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    width={16}
    height={16}
  >
    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h1a1 1 0 001-1v-6a1 1 0 00-1-1h-1z" />
  </svg>
)

const container: React.CSSProperties = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: 20,
}

const header: React.CSSProperties = {
  marginBottom: 30,
}

const title: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 4,
}

const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--ui-fg-subtle)",
}

const controls: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 10,
  alignItems: "flex-end",
  flexWrap: "wrap",
}

const fieldGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 120,
}

const input: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--ui-border-base)",
  background: "var(--ui-bg-field)",
  color: "var(--ui-fg-base)",
  fontSize: 14,
}

const button: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  background: "var(--ui-button-inverted)",
  color: "var(--ui-fg-on-inverted)",
  fontSize: 14,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
}

const secondaryButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  background: "var(--ui-bg-base)",
  color: "var(--ui-fg-base)",
  fontSize: 14,
  fontWeight: 600,
  border: "1px solid var(--ui-border-base)",
  cursor: "pointer",
}

const helpText: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ui-fg-subtle)",
  marginBottom: 24,
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 24,
}

const card: React.CSSProperties = {
  background: "var(--ui-bg-base)",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 12,
  padding: "20px",
}

const cardValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 8,
}

const cardLabel: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ui-fg-subtle)",
}

const section: React.CSSProperties = {
  marginBottom: 28,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 12,
  borderBottom: "1px solid var(--ui-border-base)",
  paddingBottom: 12,
}

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
}

const th: React.CSSProperties = {
  padding: "12px 8px",
  textAlign: "left",
  fontWeight: 600,
  color: "var(--ui-fg-subtle)",
  borderBottom: "1px solid var(--ui-border-base)",
  fontSize: 12,
  textTransform: "uppercase",
}

const td: React.CSSProperties = {
  padding: "12px 8px",
  borderBottom: "1px solid var(--ui-border-base)",
  color: "var(--ui-fg-base)",
}

const loadingMessage: React.CSSProperties = {
  textAlign: "center",
  padding: 40,
  color: "var(--ui-fg-subtle)",
}

const errorMessage: React.CSSProperties = {
  background: "var(--ui-bg-error)",
  color: "var(--ui-fg-on-error)",
  padding: 16,
  borderRadius: 8,
  marginBottom: 20,
}

const periodRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 20,
  fontSize: 13,
  color: "var(--ui-fg-subtle)",
}

const chipRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
}

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: "var(--ui-bg-subtle)",
  border: "1px solid var(--ui-border-base)",
  color: "var(--ui-fg-base)",
  fontSize: 12,
  fontWeight: 600,
}

const chartFrame: React.CSSProperties = {
  border: "1px solid var(--ui-border-base)",
  borderRadius: 12,
  background: "var(--ui-bg-base)",
  padding: 16,
  overflowX: "auto",
}

const chartLegend: React.CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 12,
}

const legendItem: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "var(--ui-fg-subtle)",
}

const legendSwatch: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
}

const chartGrid: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  minHeight: 220,
}

const chartBucket: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  minWidth: 28,
}

const chartBars: React.CSSProperties = {
  height: 180,
  width: "100%",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 4,
}

const chartBar: React.CSSProperties = {
  width: 6,
  borderRadius: 999,
  minHeight: 4,
  transition: "height 180ms ease, opacity 180ms ease",
}

const chartLabel: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ui-fg-subtle)",
  whiteSpace: "nowrap",
}

const emptyState: React.CSSProperties = {
  textAlign: "center",
  padding: 28,
  borderRadius: 12,
  border: "1px dashed var(--ui-border-base)",
  color: "var(--ui-fg-subtle)",
  background: "var(--ui-bg-base)",
}

type TimelineSeriesKey =
  | "total_preview_opens"
  | "total_message_copies"
  | "total_continue_clicks"

type TimelineBucket = {
  day: string
  total_events: number
  total_preview_opens: number
  total_message_copies: number
  total_continue_clicks: number
}

type CountByEvent = { event_name: string; events: number }
type CountBySource = { source: string; events: number }
type CountByLocale = { locale: string; events: number }

type WhatsAppAnalyticsData = {
  range: { from: string; to: string; days: number }
  filters: {
    source: string | null
    locale: string | null
    event_name: string | null
  }
  summary: {
    total_events: number
    total_preview_opens: number
    total_message_copies: number
    total_continue_clicks: number
    preview_to_copy_rate: number
    preview_to_continue_rate: number
    average_message_length: number
    average_quantity: number
    average_item_count: number
    average_total: number
  }
  events_by_type: CountByEvent[]
  sources: CountBySource[]
  locales: CountByLocale[]
  available_events: CountByEvent[]
  available_sources: CountBySource[]
  available_locales: CountByLocale[]
  timeline: TimelineBucket[]
  top_products: Array<{
    product_id: string
    product_handle: string
    product_title: string
    events: number
    quantity: number
  }>
  top_presets: Array<{
    preset_key: string
    preset_title: string
    events: number
    quantity: number
  }>
}

type AnalyticsFilters = {
  days: string
  limit: string
  from: string
  to: string
  source: string
  locale: string
  eventName: string
}

const EVENT_LABELS: Record<string, string> = {
  whatsapp_preview_opened: "Preview opened",
  whatsapp_message_copied: "Message copied",
  whatsapp_continue_clicked: "Continue clicked",
}

const TIMELINE_SERIES: Array<{
  key: TimelineSeriesKey
  label: string
  color: string
}> = [
  {
    key: "total_preview_opens",
    label: "Preview opens",
    color: "#0ea5e9",
  },
  {
    key: "total_message_copies",
    label: "Message copies",
    color: "#f59e0b",
  },
  {
    key: "total_continue_clicks",
    label: "Continue clicks",
    color: "#10b981",
  },
]

const formatTokenLabel = (value: string) => {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

const formatEventName = (eventName: string) => {
  return EVENT_LABELS[eventName] ?? formatTokenLabel(eventName.replace(/^whatsapp_/, ""))
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const formatCurrency = (value: number) => `$${value.toFixed(2)}`

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const formatShortDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

const buildQueryString = (filters: AnalyticsFilters) => {
  const params = new URLSearchParams()

  params.set("days", filters.days || "30")
  params.set("limit", filters.limit || "10")

  if (filters.from.trim()) {
    params.set("from", filters.from.trim())
  }

  if (filters.to.trim()) {
    params.set("to", filters.to.trim())
  }

  if (filters.source.trim()) {
    params.set("source", filters.source.trim())
  }

  if (filters.locale.trim()) {
    params.set("locale", filters.locale.trim())
  }

  if (filters.eventName.trim()) {
    params.set("event_name", filters.eventName.trim())
  }

  return params.toString()
}

const EmptyTableRow = ({ colSpan, message }: { colSpan: number; message: string }) => {
  return (
    <tr>
      <td style={{ ...td, textAlign: "center", color: "var(--ui-fg-subtle)" }} colSpan={colSpan}>
        {message}
      </td>
    </tr>
  )
}

function WhatsAppAnalyticsPage() {
  const pageSubtitle =
    "Track preview opens, message copies, and continue clicks across the WhatsApp ordering funnel"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState("30")
  const [limit, setLimit] = useState("10")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [source, setSource] = useState("")
  const [locale, setLocale] = useState("")
  const [eventName, setEventName] = useState("")
  const [data, setData] = useState<WhatsAppAnalyticsData | null>(null)
  const access = useAdminRouteAccess(WHATSAPP_ANALYTICS_REQUIRED_PERMISSIONS)

  const fetchAnalytics = async (filters: AnalyticsFilters) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/admin/analytics/whatsapp?${buildQueryString(filters)}`,
        { headers: { "content-type": "application/json" } }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }

      const analyticsData = (await response.json()) as WhatsAppAnalyticsData
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!access.hasAccess) {
      return
    }

    void fetchAnalytics({
      days: "30",
      limit: "10",
      from: "",
      to: "",
      source: "",
      locale: "",
      eventName: "",
    })
  }, [access.hasAccess])

  const handleRefresh = () => {
    void fetchAnalytics({
      days,
      limit,
      from,
      to,
      source,
      locale,
      eventName,
    })
  }

  const handleReset = () => {
    setDays("30")
    setLimit("10")
    setFrom("")
    setTo("")
    setSource("")
    setLocale("")
    setEventName("")

    void fetchAnalytics({
      days: "30",
      limit: "10",
      from: "",
      to: "",
      source: "",
      locale: "",
      eventName: "",
    })
  }

  const timelineMax = data
    ? Math.max(
        1,
        ...data.timeline.map((bucket) =>
          Math.max(
            bucket.total_preview_opens,
            bucket.total_message_copies,
            bucket.total_continue_clicks
          )
        )
      )
    : 1

  const timelineLabelStep = data
    ? Math.max(1, Math.ceil(Math.max(data.timeline.length, 1) / 8))
    : 1

  const activeFilterChips = data
    ? [
        data.filters.source
          ? { label: "Source", value: formatTokenLabel(data.filters.source) }
          : null,
        data.filters.locale
          ? { label: "Locale", value: data.filters.locale.toUpperCase() }
          : null,
        data.filters.event_name
          ? { label: "Event", value: formatEventName(data.filters.event_name) }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>
    : []

  if (access.loading || access.error || !access.hasAccess) {
    return (
      <div style={container}>
        <div style={header}>
          <h1 style={title}>WhatsApp Analytics</h1>
          <p style={subtitle}>{pageSubtitle}</p>
        </div>
        <AdminRouteAccessNotice
          access={access}
          requiredPermissions={WHATSAPP_ANALYTICS_REQUIRED_PERMISSIONS}
        />
      </div>
    )
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>WhatsApp Analytics</h1>
        <p style={subtitle}>{pageSubtitle}</p>
      </div>

      {error && <div style={errorMessage}>{error}</div>}

      <div style={controls}>
        <div style={fieldGroup}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Days</label>
          <input
            style={input}
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Days"
            data-testid="whatsapp-analytics-days-input"
          />
        </div>

        <div style={fieldGroup}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>From</label>
          <input
            style={input}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            data-testid="whatsapp-analytics-from-input"
          />
        </div>

        <div style={fieldGroup}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>To</label>
          <input
            style={input}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            data-testid="whatsapp-analytics-to-input"
          />
        </div>

        <div style={fieldGroup}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Source</label>
          <select
            style={input}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            data-testid="whatsapp-analytics-source-select"
          >
            <option value="">All sources</option>
            {(data?.available_sources ?? []).map((entry) => (
              <option key={entry.source} value={entry.source}>
                {`${formatTokenLabel(entry.source)} (${entry.events})`}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldGroup}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Locale</label>
          <select
            style={input}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            data-testid="whatsapp-analytics-locale-select"
          >
            <option value="">All locales</option>
            {(data?.available_locales ?? []).map((entry) => (
              <option key={entry.locale} value={entry.locale}>
                {`${entry.locale.toUpperCase()} (${entry.events})`}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldGroup}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Event</label>
          <select
            style={input}
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            data-testid="whatsapp-analytics-event-select"
          >
            <option value="">All events</option>
            {(data?.available_events ?? []).map((entry) => (
              <option key={entry.event_name} value={entry.event_name}>
                {`${formatEventName(entry.event_name)} (${entry.events})`}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldGroup}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Limit</label>
          <input
            style={input}
            type="number"
            min="1"
            max="100"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Limit"
            data-testid="whatsapp-analytics-limit-input"
          />
        </div>

        <button
          style={button}
          onClick={handleRefresh}
          type="button"
          data-testid="whatsapp-analytics-refresh"
        >
          Refresh
        </button>

        <button
          style={secondaryButton}
          onClick={handleReset}
          type="button"
          data-testid="whatsapp-analytics-reset"
        >
          Reset filters
        </button>
      </div>

      <div style={helpText}>
        Set exact From/To dates for a fixed range. Leave them empty to use the rolling Days window.
      </div>

      {loading && <div style={loadingMessage}>Loading analytics...</div>}

      {data && !loading && (
        <>
          <div style={grid}>
            <div style={card} data-testid="whatsapp-analytics-card-total-events">
              <div style={cardValue} data-testid="whatsapp-analytics-total-events">{data.summary.total_events}</div>
              <div style={cardLabel}>Total Events</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_preview_opens}</div>
              <div style={cardLabel}>Preview Opens</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_message_copies}</div>
              <div style={cardLabel}>Message Copies</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_continue_clicks}</div>
              <div style={cardLabel}>Continue Clicks</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{formatPercent(data.summary.preview_to_copy_rate)}</div>
              <div style={cardLabel}>Preview to Copy Rate</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{formatPercent(data.summary.preview_to_continue_rate)}</div>
              <div style={cardLabel}>Preview to Continue Rate</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.average_message_length.toFixed(1)}</div>
              <div style={cardLabel}>Avg Message Length</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.average_quantity.toFixed(1)}</div>
              <div style={cardLabel}>Avg Quantity</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.average_item_count.toFixed(1)}</div>
              <div style={cardLabel}>Avg Cart Items</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{formatCurrency(data.summary.average_total)}</div>
              <div style={cardLabel}>Avg Cart Total</div>
            </div>
          </div>

          <div style={periodRow}>
            <div>
              <strong>Period:</strong> {formatDate(data.range.from)} to {formatDate(data.range.to)} ({data.range.days} days)
            </div>
            {activeFilterChips.length > 0 && (
              <div style={chipRow} data-testid="whatsapp-analytics-active-filters">
                {activeFilterChips.map((entry) => (
                  <span
                    key={`${entry.label}-${entry.value}`}
                    style={chip}
                    data-testid={`whatsapp-analytics-chip-${entry.label.toLowerCase()}`}
                  >
                    {entry.label}: {entry.value}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={section}>
            <div style={sectionTitle}>Daily Trend</div>

            {data.summary.total_events > 0 ? (
              <>
                <div style={chartLegend}>
                  {TIMELINE_SERIES.map((series) => (
                    <span key={series.key} style={legendItem}>
                      <span style={{ ...legendSwatch, background: series.color }} />
                      {series.label}
                    </span>
                  ))}
                </div>

                <div style={chartFrame}>
                  <div
                    style={{
                      ...chartGrid,
                      minWidth: Math.max(340, data.timeline.length * 28),
                    }}
                  >
                    {data.timeline.map((bucket, index) => {
                      const showLabel =
                        index === 0 ||
                        index === data.timeline.length - 1 ||
                        index % timelineLabelStep === 0

                      return (
                        <div key={bucket.day} style={chartBucket}>
                          <div style={chartBars}>
                            {TIMELINE_SERIES.map((series) => {
                              const value = bucket[series.key]
                              const height = value > 0 ? Math.max(8, (value / timelineMax) * 100) : 4

                              return (
                                <div
                                  key={`${bucket.day}-${series.key}`}
                                  style={{
                                    ...chartBar,
                                    height: `${height}%`,
                                    background: series.color,
                                    opacity: value > 0 ? 1 : 0.14,
                                  }}
                                  title={`${formatDate(bucket.day)} • ${series.label}: ${value}`}
                                />
                              )
                            })}
                          </div>
                          <div style={chartLabel}>{showLabel ? formatShortDate(bucket.day) : "\u00A0"}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ ...helpText, marginBottom: 0, marginTop: 10 }}>
                  Bars show per-day activity for preview opens, copied messages, and continue clicks in the selected range.
                </div>
              </>
            ) : (
              <div style={emptyState}>No WhatsApp events matched the selected date range and filters.</div>
            )}
          </div>

          <div style={section}>
            <div style={sectionTitle}>Events by Type</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Event</th>
                  <th style={{ ...th, textAlign: "right" }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.events_by_type.length > 0 ? (
                  data.events_by_type.map((event) => (
                    <tr key={event.event_name}>
                      <td style={td}>{formatEventName(event.event_name)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{event.events}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={2} message="No event rows for the current selection." />
                )}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Top Sources</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Source</th>
                  <th style={{ ...th, textAlign: "right" }}>Events</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.length > 0 ? (
                  data.sources.map((entry) => (
                    <tr key={entry.source}>
                      <td style={td}>{formatTokenLabel(entry.source)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{entry.events}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={2} message="No source activity for the current selection." />
                )}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Locales</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Locale</th>
                  <th style={{ ...th, textAlign: "right" }}>Events</th>
                </tr>
              </thead>
              <tbody>
                {data.locales.length > 0 ? (
                  data.locales.map((entry) => (
                    <tr key={entry.locale}>
                      <td style={td}>{entry.locale.toUpperCase()}</td>
                      <td style={{ ...td, textAlign: "right" }}>{entry.events}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={2} message="No locale activity for the current selection." />
                )}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Top Products</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Product</th>
                  <th style={{ ...th, textAlign: "right" }}>Events</th>
                  <th style={{ ...th, textAlign: "right" }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.length > 0 ? (
                  data.top_products.map((product) => (
                    <tr key={product.product_id}>
                      <td style={td}>{product.product_title || product.product_handle}</td>
                      <td style={{ ...td, textAlign: "right" }}>{product.events}</td>
                      <td style={{ ...td, textAlign: "right" }}>{product.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={3} message="No product-level activity for the current selection." />
                )}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Top Presets</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Preset</th>
                  <th style={{ ...th, textAlign: "right" }}>Events</th>
                  <th style={{ ...th, textAlign: "right" }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data.top_presets.length > 0 ? (
                  data.top_presets.map((preset) => (
                    <tr key={preset.preset_key}>
                      <td style={td}>{preset.preset_title}</td>
                      <td style={{ ...td, textAlign: "right" }}>{preset.events}</td>
                      <td style={{ ...td, textAlign: "right" }}>{preset.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={3} message="No preset-linked activity for the current selection." />
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "WhatsApp Analytics",
  icon: AnalyticsIcon,
})

export default WhatsAppAnalyticsPage
