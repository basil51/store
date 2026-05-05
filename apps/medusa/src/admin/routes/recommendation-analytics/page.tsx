import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

import {
  AdminRouteAccessNotice,
  useAdminRouteAccess,
} from "../../lib/admin-route-access"

const RECOMMENDATION_ANALYTICS_REQUIRED_PERMISSIONS = ["analytics.read"] as const

const AnalyticsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path d="M3 3.75A.75.75 0 013.75 3h12.5a.75.75 0 010 1.5H15v10.75a.75.75 0 01-1.5 0V9.5h-2v5.75a.75.75 0 01-1.5 0V7.5h-2v7.75a.75.75 0 01-1.5 0v-4.5h-2v4.5a.75.75 0 01-1.5 0V3.75z" />
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
  marginBottom: 24,
  alignItems: "center",
  flexWrap: "wrap",
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
  padding: 20,
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

type RecommendationAnalyticsData = {
  range: { from: string; to: string; days: number }
  summary: {
    total_events: number
    total_rail_views: number
    total_product_clicks: number
    click_through_rate: number
  }
  top_source_products: Array<{
    source_product_id: string
    source_product_handle: string | null
    source_product_title: string | null
    events: number
    rail_views: number
    product_clicks: number
    average_recommended_count: number
    last_seen_at: string
  }>
  top_clicked_products: Array<{
    recommended_product_id: string
    recommended_product_handle: string | null
    recommended_product_title: string | null
    clicks: number
    average_slot: number
    last_clicked_at: string
  }>
  recent_events: Array<{
    event_name: string
    rail: string
    source_product_handle: string | null
    source_product_title: string | null
    recommended_product_handle: string | null
    recommended_product_title: string | null
    recommendation_slot: number | null
    recommended_count: number
    locale: string | null
    country_code: string | null
    occurred_at: string
  }>
}

const formatDate = (value: string) => new Date(value).toLocaleString()

function RecommendationAnalyticsPage() {
  const pageSubtitle =
    "Measure PDP recommendation rail views and clicks so ranking changes can be evaluated."
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState("30")
  const [limit, setLimit] = useState("20")
  const [data, setData] = useState<RecommendationAnalyticsData | null>(null)
  const access = useAdminRouteAccess(RECOMMENDATION_ANALYTICS_REQUIRED_PERMISSIONS)

  const fetchAnalytics = async (daysValue: string, limitValue: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/admin/analytics/recommendation?days=${daysValue}&limit=${limitValue}`,
        { headers: { "content-type": "application/json" } }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch recommendation analytics data")
      }

      setData((await response.json()) as RecommendationAnalyticsData)
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

    void fetchAnalytics(days, limit)
  }, [access.hasAccess])

  if (access.loading || access.error || !access.hasAccess) {
    return (
      <div style={container}>
        <div style={header}>
          <h1 style={title}>Recommendation Analytics</h1>
          <p style={subtitle}>{pageSubtitle}</p>
        </div>
        <AdminRouteAccessNotice
          access={access}
          requiredPermissions={RECOMMENDATION_ANALYTICS_REQUIRED_PERMISSIONS}
        />
      </div>
    )
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>Recommendation Analytics</h1>
        <p style={subtitle}>{pageSubtitle}</p>
      </div>

      {error && <div style={errorMessage}>{error}</div>}

      <div style={controls}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
            Days
          </label>
          <input
            style={input}
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
            Limit
          </label>
          <input
            style={input}
            type="number"
            min="1"
            max="100"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </div>
        <button style={button} onClick={() => fetchAnalytics(days, limit)}>
          Refresh
        </button>
      </div>

      {loading && <div style={loadingMessage}>Loading recommendation analytics...</div>}

      {data && !loading && (
        <>
          <div style={grid}>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_events}</div>
              <div style={cardLabel}>Total events</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_rail_views}</div>
              <div style={cardLabel}>Rail views</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_product_clicks}</div>
              <div style={cardLabel}>Product clicks</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.click_through_rate.toFixed(1)}%</div>
              <div style={cardLabel}>Click-through rate</div>
            </div>
          </div>

          <div style={{ marginBottom: 20, fontSize: 13, color: "var(--ui-fg-subtle)" }}>
            <strong>Period:</strong> {formatDate(data.range.from)} to {formatDate(data.range.to)} ({data.range.days} days)
          </div>

          <div style={section}>
            <div style={sectionTitle}>Top Source Products</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Source Product</th>
                  <th style={{ ...th, textAlign: "right" }}>Views</th>
                  <th style={{ ...th, textAlign: "right" }}>Clicks</th>
                  <th style={{ ...th, textAlign: "right" }}>Avg Rail Size</th>
                  <th style={th}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {data.top_source_products.map((entry) => (
                  <tr key={entry.source_product_id}>
                    <td style={td}>{entry.source_product_title ?? entry.source_product_handle ?? entry.source_product_id}</td>
                    <td style={{ ...td, textAlign: "right" }}>{entry.rail_views}</td>
                    <td style={{ ...td, textAlign: "right" }}>{entry.product_clicks}</td>
                    <td style={{ ...td, textAlign: "right" }}>{entry.average_recommended_count.toFixed(1)}</td>
                    <td style={td}>{formatDate(entry.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Top Clicked Recommended Products</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Recommended Product</th>
                  <th style={{ ...th, textAlign: "right" }}>Clicks</th>
                  <th style={{ ...th, textAlign: "right" }}>Avg Slot</th>
                  <th style={th}>Last Clicked</th>
                </tr>
              </thead>
              <tbody>
                {data.top_clicked_products.map((entry) => (
                  <tr key={entry.recommended_product_id}>
                    <td style={td}>{entry.recommended_product_title ?? entry.recommended_product_handle ?? entry.recommended_product_id}</td>
                    <td style={{ ...td, textAlign: "right" }}>{entry.clicks}</td>
                    <td style={{ ...td, textAlign: "right" }}>{entry.average_slot.toFixed(1)}</td>
                    <td style={td}>{formatDate(entry.last_clicked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Recent Recommendation Events</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Event</th>
                  <th style={th}>Source</th>
                  <th style={th}>Recommended</th>
                  <th style={{ ...th, textAlign: "right" }}>Slot</th>
                  <th style={{ ...th, textAlign: "right" }}>Rail Size</th>
                  <th style={th}>Locale</th>
                  <th style={th}>Country</th>
                  <th style={th}>Occurred</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_events.map((entry, index) => (
                  <tr key={`${entry.event_name}-${entry.occurred_at}-${index}`}>
                    <td style={td}>{entry.event_name.replace(/_/g, " ")}</td>
                    <td style={td}>{entry.source_product_title ?? entry.source_product_handle ?? "-"}</td>
                    <td style={td}>{entry.recommended_product_title ?? entry.recommended_product_handle ?? "-"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{entry.recommendation_slot ?? "-"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{entry.recommended_count}</td>
                    <td style={td}>{entry.locale ?? "-"}</td>
                    <td style={td}>{entry.country_code ?? "-"}</td>
                    <td style={td}>{formatDate(entry.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Recommendation Analytics",
  icon: AnalyticsIcon,
})

export default RecommendationAnalyticsPage