import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState, useEffect } from "react"

// ─── Sidebar icon ─────────────────────────────────────────────────────────────
const AnalyticsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h1a1 1 0 001-1v-6a1 1 0 00-1-1h-1z" />
  </svg>
)

// ─── Styles ────────────────────────────────────────────────────────────────────
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
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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

// ─── Types ─────────────────────────────────────────────────────────────────────
type AnalyticsData = {
  range: { from: string; to: string; days: number }
  summary: {
    total_events: number
    total_selections: number
    total_cart_adds: number
    total_purchases: number
    total_revenue: number
  }
  events_by_type: Array<{ event_name: string; events: number }>
  top_presets: Array<{
    preset_key: string
    preset_title: string
    events: number
    quantity: number
  }>
  top_products: Array<{
    product_handle: string
    product_title: string
    events: number
    quantity: number
  }>
  purchased_presets: Array<{
    preset_key: string
    preset_title: string
    purchases: number
    purchased_quantity: number
    revenue: number
    average_value: number
  }>
  purchased_products: Array<{
    product_handle: string
    product_title: string
    purchases: number
    revenue: number
    average_value: number
  }>
}

// ─── Page ──────────────────────────────────────────────────────────────────────
function PresetAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState("30")
  const [limit, setLimit] = useState("10")
  const [data, setData] = useState<AnalyticsData | null>(null)

  const fetchAnalytics = async (daysValue: string, limitValue: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/admin/analytics/preset?days=${daysValue}&limit=${limitValue}`,
        { headers: { "content-type": "application/json" } }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }

      const analyticsData = (await response.json()) as AnalyticsData
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(days, limit)
  }, [])

  const handleRefresh = () => {
    fetchAnalytics(days, limit)
  }

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>Preset Analytics</h1>
        <p style={subtitle}>
          Track preset selections, cart additions, and purchases across your store
        </p>
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
            onChange={(e) => setDays(e.target.value)}
            placeholder="Days"
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
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Limit"
          />
        </div>
        <button style={button} onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      {loading && <div style={loadingMessage}>Loading analytics...</div>}

      {data && !loading && (
        <>
          {/* Summary Grid */}
          <div style={grid}>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_events}</div>
              <div style={cardLabel}>Total Events</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_selections}</div>
              <div style={cardLabel}>Selections</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_cart_adds}</div>
              <div style={cardLabel}>Added to Cart</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_purchases}</div>
              <div style={cardLabel}>Purchases</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{formatCurrency(data.summary.total_revenue)}</div>
              <div style={cardLabel}>Revenue</div>
            </div>
            {data.summary.total_purchases > 0 && (
              <div style={card}>
                <div style={cardValue}>
                  {(data.summary.total_revenue / data.summary.total_purchases).toFixed(2)}%
                </div>
                <div style={cardLabel}>Conversion Rate</div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div style={{ marginBottom: 20, fontSize: 13, color: "var(--ui-fg-subtle)" }}>
            <strong>Period:</strong> {formatDate(data.range.from)} to {formatDate(data.range.to)} ({data.range.days} days)
          </div>

          {/* Events by Type */}
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
                {data.events_by_type.map((event) => (
                  <tr key={event.event_name}>
                    <td style={td}>{event.event_name.replace(/_/g, " ")}</td>
                    <td style={{ ...td, textAlign: "right" }}>{event.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Presets */}
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
                {data.top_presets.map((preset) => (
                  <tr key={preset.preset_key}>
                    <td style={td}>{preset.preset_title}</td>
                    <td style={{ ...td, textAlign: "right" }}>{preset.events}</td>
                    <td style={{ ...td, textAlign: "right" }}>{preset.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Products */}
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
                {data.top_products.map((product) => (
                  <tr key={product.product_handle}>
                    <td style={td}>{product.product_title}</td>
                    <td style={{ ...td, textAlign: "right" }}>{product.events}</td>
                    <td style={{ ...td, textAlign: "right" }}>{product.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Purchased Presets */}
          {data.purchased_presets.length > 0 && (
            <div style={section}>
              <div style={sectionTitle}>Purchased Presets</div>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Preset</th>
                    <th style={{ ...th, textAlign: "right" }}>Purchases</th>
                    <th style={{ ...th, textAlign: "right" }}>Quantity</th>
                    <th style={{ ...th, textAlign: "right" }}>Revenue</th>
                    <th style={{ ...th, textAlign: "right" }}>Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchased_presets.map((preset) => (
                    <tr key={preset.preset_key}>
                      <td style={td}>{preset.preset_title}</td>
                      <td style={{ ...td, textAlign: "right" }}>{preset.purchases}</td>
                      <td style={{ ...td, textAlign: "right" }}>{preset.purchased_quantity}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {formatCurrency(preset.revenue)}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {formatCurrency(preset.average_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchased Products */}
          {data.purchased_products.length > 0 && (
            <div style={section}>
              <div style={sectionTitle}>Purchased Products</div>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Product</th>
                    <th style={{ ...th, textAlign: "right" }}>Purchases</th>
                    <th style={{ ...th, textAlign: "right" }}>Revenue</th>
                    <th style={{ ...th, textAlign: "right" }}>Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchased_products.map((product) => (
                    <tr key={product.product_handle}>
                      <td style={td}>{product.product_title}</td>
                      <td style={{ ...td, textAlign: "right" }}>{product.purchases}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {formatCurrency(product.revenue)}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {formatCurrency(product.average_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Preset Analytics",
  icon: AnalyticsIcon,
})

export default PresetAnalyticsPage
