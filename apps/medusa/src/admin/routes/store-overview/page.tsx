import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

import { adminHref } from "../../lib/admin-href"
import {
  AdminRouteAccessNotice,
  useAdminRouteAccess,
} from "../../lib/admin-route-access"

const STORE_OVERVIEW_REQUIRED_PERMISSIONS = ["orders.manage"] as const

const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
)

const container: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 20,
}

const title: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 6,
}

const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--ui-fg-subtle)",
  marginBottom: 22,
}

const controls: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginBottom: 20,
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
  padding: "9px 16px",
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
  gap: 14,
  marginBottom: 26,
}

const card: React.CSSProperties = {
  background: "var(--ui-bg-base)",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 12,
  padding: "18px 20px",
}

const cardValue: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
}

const cardLabel: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ui-fg-subtle)",
  marginTop: 6,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 12,
  borderBottom: "1px solid var(--ui-border-base)",
  paddingBottom: 10,
}

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
}

const th: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontWeight: 600,
  color: "var(--ui-fg-subtle)",
  borderBottom: "1px solid var(--ui-border-base)",
  fontSize: 12,
  textTransform: "uppercase",
}

const td: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid var(--ui-border-base)",
  color: "var(--ui-fg-base)",
}

const muted: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ui-fg-subtle)",
  marginTop: 8,
}

const errorBox: React.CSSProperties = {
  background: "var(--ui-bg-error)",
  color: "var(--ui-fg-on-error)",
  padding: 14,
  borderRadius: 8,
  marginBottom: 16,
}

type OverviewPayload = {
  range: { from: string; to: string; days: number }
  summary: {
    order_count: number
    revenue_total: number
    currency_code: string | null
    status_counts: Record<string, number>
  }
  recent_orders: Array<{
    id: string
    display_id: number | null
    email: string | null
    created_at: string | null
    status: string | null
    currency_code: string | null
    total: number
  }>
  top_products: Array<{
    product_id: string | null
    title: string
    units_sold: number
    line_revenue: number
  }>
  scope: { restricted: boolean; sales_channel_ids: string[] }
  fetched_order_count?: number
  total_orders_hint?: number
}

const formatMoney = (amount: number, currency: string | null) => {
  if (!currency) {
    return amount.toFixed(2)
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function StoreOverviewPage() {
  const pageSubtitle =
    "Phase 9.1: order volume, revenue (excluding canceled), recent orders with links into Medusa Orders, and top products with links into the product editor when line items carry a product id. Scoped users see orders for mapped default sales channels only."
  const [days, setDays] = useState("30")
  const [limit, setLimit] = useState("10")
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const access = useAdminRouteAccess(STORE_OVERVIEW_REQUIRED_PERMISSIONS)

  const load = async (d: string, l: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/admin/dashboard/overview?days=${encodeURIComponent(d)}&limit=${encodeURIComponent(l)}`, {
        headers: { "content-type": "application/json" },
      })
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`)
      }
      setData((await res.json()) as OverviewPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!access.hasAccess) {
      return
    }

    void load(days, limit)
  }, [access.hasAccess])

  if (access.loading || access.error || !access.hasAccess) {
    return (
      <div style={container}>
        <h1 style={title}>Store overview</h1>
        <p style={subtitle}>{pageSubtitle}</p>
        <AdminRouteAccessNotice
          access={access}
          requiredPermissions={STORE_OVERVIEW_REQUIRED_PERMISSIONS}
        />
      </div>
    )
  }

  const statusEntries = data
    ? Object.entries(data.summary.status_counts).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div style={container}>
      <h1 style={title}>Store overview</h1>
      <p style={subtitle}>{pageSubtitle}</p>

      <div style={controls}>
        <label style={{ fontSize: 13, color: "var(--ui-fg-subtle)" }}>
          Days{" "}
          <input style={input} value={days} onChange={(e) => setDays(e.target.value)} type="number" min={1} max={365} />
        </label>
        <label style={{ fontSize: 13, color: "var(--ui-fg-subtle)" }}>
          Top products{" "}
          <input style={input} value={limit} onChange={(e) => setLimit(e.target.value)} type="number" min={5} max={50} />
        </label>
        <button type="button" style={button} onClick={() => void load(days, limit)} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}

      {data && !loading ? (
        <>
          <div style={grid}>
            <div style={card}>
              <div style={cardValue}>{data.summary.order_count}</div>
              <div style={cardLabel}>Paid / non-canceled orders</div>
            </div>
            <div style={card}>
              <div style={cardValue}>
                {formatMoney(data.summary.revenue_total, data.summary.currency_code)}
              </div>
              <div style={cardLabel}>Revenue in range</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.recent_orders.length}</div>
              <div style={cardLabel}>Recent rows shown</div>
            </div>
          </div>

          {data.scope.restricted ? (
            <p style={muted}>
              Scoped to {data.scope.sales_channel_ids.length} sales channel
              {data.scope.sales_channel_ids.length === 1 ? "" : "s"}. Fetched {data.fetched_order_count ?? "—"} recent
              orders (cap 500); total in DB may be higher.
            </p>
          ) : (
            <p style={muted}>
              All stores (super admin). Fetched {data.fetched_order_count ?? "—"} recent orders (cap 500).
            </p>
          )}

          {statusEntries.length > 0 ? (
            <div style={{ marginBottom: 28 }}>
              <div style={sectionTitle}>Order status mix (range)</div>
              <p style={{ ...muted, marginTop: -6, marginBottom: 10 }}>
                Native Medusa statuses in this window; Phase 9.4 can align labels to operational stages.
              </p>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: "right" }}>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {statusEntries.map(([k, v]) => (
                    <tr key={k}>
                      <td style={td}>{k}</td>
                      <td style={{ ...td, textAlign: "right" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div style={{ marginBottom: 28 }}>
            <div style={sectionTitle}>Recent orders</div>
            <a
              href={adminHref("/orders")}
              style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ui-fg-interactive)",
                textDecoration: "none",
                marginBottom: 12,
              }}
            >
              Open full order list →
            </a>
            {data.recent_orders.length === 0 ? (
              <p style={muted}>No orders in this range.</p>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Email</th>
                    <th style={th}>Status</th>
                    <th style={th}>Created</th>
                    <th style={{ ...th, textAlign: "right" }}>Total</th>
                    <th style={th}> </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td style={td}>{o.display_id ?? o.id.slice(0, 8)}</td>
                      <td style={td}>{o.email ?? "—"}</td>
                      <td style={td}>{o.status ?? "—"}</td>
                      <td style={td}>{o.created_at ? new Date(o.created_at).toLocaleString() : "—"}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {formatMoney(o.total, o.currency_code ?? data.summary.currency_code)}
                      </td>
                      <td style={td}>
                        <a
                          href={adminHref(`/orders/${o.id}`)}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--ui-fg-interactive)",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <div style={sectionTitle}>Top products (by line revenue)</div>
            {data.top_products.length === 0 ? (
              <p style={muted}>No line items in non-canceled orders for this range.</p>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Product</th>
                    <th style={{ ...th, textAlign: "right" }}>Units</th>
                    <th style={{ ...th, textAlign: "right" }}>Line revenue</th>
                    <th style={th}> </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_products.map((p) => (
                    <tr key={p.product_id ?? p.title}>
                      <td style={td}>{p.title}</td>
                      <td style={{ ...td, textAlign: "right" }}>{p.units_sold}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {formatMoney(p.line_revenue, data.summary.currency_code)}
                      </td>
                      <td style={td}>
                        {p.product_id ? (
                          <a
                            href={adminHref(`/products/${p.product_id}/edit`)}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--ui-fg-interactive)",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Open
                          </a>
                        ) : (
                          <span style={{ ...muted, marginTop: 0 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : loading ? (
        <p style={muted}>Loading overview…</p>
      ) : null}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Store overview",
  icon: DashboardIcon,
  rank: 10,
})

export default StoreOverviewPage
