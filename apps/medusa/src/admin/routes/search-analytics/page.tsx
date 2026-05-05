import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

import {
  AdminRouteAccessNotice,
  useAdminRouteAccess,
} from "../../lib/admin-route-access"

const SEARCH_ANALYTICS_REQUIRED_PERMISSIONS = ["analytics.read"] as const

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path fillRule="evenodd" d="M8.5 3a5.5 5.5 0 103.473 9.765l2.631 2.631a1 1 0 001.415-1.415l-2.631-2.631A5.5 5.5 0 008.5 3zM5 8.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z" clipRule="evenodd" />
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

const textarea: React.CSSProperties = {
  ...input,
  minHeight: 84,
  resize: "vertical",
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
  ...button,
  background: "var(--ui-bg-subtle)",
  color: "var(--ui-fg-base)",
  border: "1px solid var(--ui-border-base)",
}

const dangerButton: React.CSSProperties = {
  ...secondaryButton,
  color: "var(--ui-fg-error)",
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

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 16,
}

const helperText: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ui-fg-subtle)",
  lineHeight: 1.5,
  marginBottom: 16,
}

const formActions: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
}

const badge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: 999,
  background: "var(--ui-bg-subtle)",
  border: "1px solid var(--ui-border-base)",
  fontSize: 12,
  color: "var(--ui-fg-base)",
}

const successMessage: React.CSSProperties = {
  background: "var(--ui-bg-highlight)",
  color: "var(--ui-fg-base)",
  padding: 16,
  borderRadius: 8,
  marginBottom: 20,
  border: "1px solid var(--ui-border-base)",
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

type SearchAnalyticsData = {
  range: { from: string; to: string; days: number }
  summary: {
    total_events: number
    total_submissions: number
    total_result_views: number
    zero_result_views: number
    average_results: number
    total_recovery_views: number
    recovery_view_rate: number
    average_recovered_results: number
    override_recovery_views: number
    analytics_recovery_views: number
  }
  top_queries: Array<{
    query: string
    normalized_query: string
    events: number
    submissions: number
    result_views: number
    zero_result_views: number
    average_results: number
    last_seen_at: string
  }>
  zero_result_queries: Array<{
    query: string
    normalized_query: string
    zero_result_views: number
    last_seen_at: string
  }>
  recovered_queries: Array<{
    original_query: string
    recovered_query: string
    normalized_query: string
    recovery_source: string
    recovery_views: number
    average_results: number
    last_seen_at: string
  }>
  recovery_overrides: Array<{
    id: number
    query: string
    normalized_query: string
    target_query: string
    target_normalized_query: string
    locale: string | null
    country_code: string | null
    note: string | null
    created_at: string
    updated_at: string
  }>
  recent_queries: Array<{
    event_name: string
    query: string
    source: string | null
    locale: string | null
    country_code: string | null
    result_count: number | null
    occurred_at: string
  }>
}

const formatDate = (value: string) => new Date(value).toLocaleString()
const formatScope = (locale: string | null, countryCode: string | null) => {
  const parts = [locale, countryCode].filter(Boolean).map((value) => value!.toUpperCase())

  return parts.length ? parts.join(" · ") : "Global"
}

const formatRecoverySource = (value: string) =>
  value === "override" ? "Override" : "Analytics"

function SearchAnalyticsPage() {
  const pageSubtitle =
    "Track storefront searches, top queries, and zero-result demand signals."
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState("30")
  const [limit, setLimit] = useState("20")
  const [data, setData] = useState<SearchAnalyticsData | null>(null)
  const access = useAdminRouteAccess(SEARCH_ANALYTICS_REQUIRED_PERMISSIONS)
  const writeAccess = useAdminRouteAccess(["settings.manage"])
  const [overrideQuery, setOverrideQuery] = useState("")
  const [overrideTargetQuery, setOverrideTargetQuery] = useState("")
  const [overrideLocale, setOverrideLocale] = useState("")
  const [overrideCountryCode, setOverrideCountryCode] = useState("")
  const [overrideNote, setOverrideNote] = useState("")
  const [overrideBusy, setOverrideBusy] = useState(false)
  const [overrideDeletingId, setOverrideDeletingId] = useState<number | null>(null)
  const [overrideFeedback, setOverrideFeedback] = useState<{
    tone: "success" | "error"
    message: string
  } | null>(null)

  const fetchAnalytics = async (daysValue: string, limitValue: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/admin/analytics/search?days=${daysValue}&limit=${limitValue}`,
        { headers: { "content-type": "application/json" } }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch search analytics data")
      }

      setData((await response.json()) as SearchAnalyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const resetOverrideForm = () => {
    setOverrideQuery("")
    setOverrideTargetQuery("")
    setOverrideLocale("")
    setOverrideCountryCode("")
    setOverrideNote("")
  }

  const saveRecoveryOverride = async () => {
    if (!overrideQuery.trim() || !overrideTargetQuery.trim()) {
      setOverrideFeedback({
        tone: "error",
        message: "Query and recovery query are required.",
      })
      return
    }

    setOverrideBusy(true)
    setOverrideFeedback(null)

    try {
      const response = await fetch("/admin/analytics/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: overrideQuery,
          target_query: overrideTargetQuery,
          locale: overrideLocale || null,
          country_code: overrideCountryCode || null,
          note: overrideNote || null,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null

        throw new Error(payload?.message || "Failed to save recovery override")
      }

      resetOverrideForm()
      setOverrideFeedback({
        tone: "success",
        message: "Recovery override saved.",
      })
      await fetchAnalytics(days, limit)
    } catch (err) {
      setOverrideFeedback({
        tone: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setOverrideBusy(false)
    }
  }

  const deleteRecoveryOverride = async (id: number) => {
    setOverrideDeletingId(id)
    setOverrideFeedback(null)

    try {
      const response = await fetch(`/admin/analytics/search?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null

        throw new Error(payload?.message || "Failed to delete recovery override")
      }

      setOverrideFeedback({
        tone: "success",
        message: "Recovery override removed.",
      })
      await fetchAnalytics(days, limit)
    } catch (err) {
      setOverrideFeedback({
        tone: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setOverrideDeletingId(null)
    }
  }

  useEffect(() => {
    if (!access.hasAccess) {
      return
    }

    void fetchAnalytics(days, limit)
  }, [access.hasAccess])

  const zeroResultRate = data?.summary.total_result_views
    ? (data.summary.zero_result_views / data.summary.total_result_views) * 100
    : 0

  if (access.loading || access.error || !access.hasAccess) {
    return (
      <div style={container}>
        <div style={header}>
          <h1 style={title}>Search Analytics</h1>
          <p style={subtitle}>{pageSubtitle}</p>
        </div>
        <AdminRouteAccessNotice
          access={access}
          requiredPermissions={SEARCH_ANALYTICS_REQUIRED_PERMISSIONS}
        />
      </div>
    )
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>Search Analytics</h1>
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
            data-testid="search-analytics-days-input"
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
            data-testid="search-analytics-limit-input"
          />
        </div>
        <button style={button} onClick={() => fetchAnalytics(days, limit)}>
          Refresh
        </button>
      </div>

      {loading && <div style={loadingMessage}>Loading search analytics...</div>}

      {data && !loading && (
        <>
          <div style={grid}>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_events}</div>
              <div style={cardLabel}>Total events</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_submissions}</div>
              <div style={cardLabel}>Search submissions</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_result_views}</div>
              <div style={cardLabel}>Result views</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.zero_result_views}</div>
              <div style={cardLabel}>Zero-result views</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{zeroResultRate.toFixed(1)}%</div>
              <div style={cardLabel}>Zero-result rate</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.average_results.toFixed(1)}</div>
              <div style={cardLabel}>Average results</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.total_recovery_views}</div>
              <div style={cardLabel}>Recovered result views</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.recovery_view_rate.toFixed(1)}%</div>
              <div style={cardLabel}>Recovery rate</div>
            </div>
            <div style={card}>
              <div style={cardValue}>{data.summary.average_recovered_results.toFixed(1)}</div>
              <div style={cardLabel}>Avg recovered results</div>
            </div>
          </div>

          <div style={{ marginBottom: 20, fontSize: 13, color: "var(--ui-fg-subtle)" }}>
            <strong>Period:</strong> {formatDate(data.range.from)} to{" "}
            {formatDate(data.range.to)} ({data.range.days} days)
          </div>

          <div style={section}>
            <div style={sectionTitle}>Recovery Overrides</div>
            <div style={helperText}>
              Add exact query overrides for known misspellings, aliases, or merchandising terms.
              These overrides are checked before analytics-based recovery, so valuable fixes do not
              need historical traffic first.
            </div>

            {overrideFeedback ? (
              <div
                style={
                  overrideFeedback.tone === "error" ? errorMessage : successMessage
                }
              >
                {overrideFeedback.message}
              </div>
            ) : null}

            {writeAccess.hasAccess ? (
              <div style={card}>
                <div style={formGrid}>
                  <div>
                    <label
                      style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}
                    >
                      Query
                    </label>
                    <input
                      style={input}
                      value={overrideQuery}
                      onChange={(event) => setOverrideQuery(event.target.value)}
                      placeholder="labtop"
                    />
                  </div>
                  <div>
                    <label
                      style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}
                    >
                      Recovery Query
                    </label>
                    <input
                      style={input}
                      value={overrideTargetQuery}
                      onChange={(event) => setOverrideTargetQuery(event.target.value)}
                      placeholder="laptop"
                    />
                  </div>
                  <div>
                    <label
                      style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}
                    >
                      Locale
                    </label>
                    <input
                      style={input}
                      value={overrideLocale}
                      onChange={(event) => setOverrideLocale(event.target.value)}
                      placeholder="en"
                    />
                  </div>
                  <div>
                    <label
                      style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}
                    >
                      Country
                    </label>
                    <input
                      style={input}
                      value={overrideCountryCode}
                      onChange={(event) => setOverrideCountryCode(event.target.value)}
                      placeholder="us"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}
                  >
                    Note
                  </label>
                  <textarea
                    style={textarea}
                    value={overrideNote}
                    onChange={(event) => setOverrideNote(event.target.value)}
                    placeholder="Why this override exists or which campaign depends on it."
                  />
                </div>
                <div style={formActions}>
                  <button style={button} onClick={saveRecoveryOverride} disabled={overrideBusy}>
                    {overrideBusy ? "Saving..." : "Save Override"}
                  </button>
                  <button
                    style={secondaryButton}
                    onClick={resetOverrideForm}
                    disabled={overrideBusy}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div style={card}>
                <div style={helperText}>
                  {writeAccess.loading
                    ? "Checking override edit permissions..."
                    : "Editing overrides requires settings.manage."}
                </div>
              </div>
            )}

            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Query</th>
                  <th style={th}>Recovery Query</th>
                  <th style={th}>Scope</th>
                  <th style={th}>Note</th>
                  <th style={th}>Updated</th>
                  <th style={{ ...th, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recovery_overrides.length ? (
                  data.recovery_overrides.map((override) => (
                    <tr key={override.id}>
                      <td style={td}>{override.query}</td>
                      <td style={td}>{override.target_query}</td>
                      <td style={td}>
                        <span style={badge}>
                          {formatScope(override.locale, override.country_code)}
                        </span>
                      </td>
                      <td style={td}>{override.note ?? "-"}</td>
                      <td style={td}>{formatDate(override.updated_at)}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {writeAccess.hasAccess ? (
                          <button
                            style={dangerButton}
                            onClick={() => deleteRecoveryOverride(override.id)}
                            disabled={overrideDeletingId === override.id}
                          >
                            {overrideDeletingId === override.id ? "Removing..." : "Delete"}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={td} colSpan={6}>
                      No recovery overrides configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Top Queries</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Query</th>
                  <th style={{ ...th, textAlign: "right" }}>Events</th>
                  <th style={{ ...th, textAlign: "right" }}>Submissions</th>
                  <th style={{ ...th, textAlign: "right" }}>Result Views</th>
                  <th style={{ ...th, textAlign: "right" }}>Zero Results</th>
                  <th style={{ ...th, textAlign: "right" }}>Avg Results</th>
                  <th style={th}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {data.top_queries.map((query) => (
                  <tr key={query.normalized_query}>
                    <td style={td}>{query.query}</td>
                    <td style={{ ...td, textAlign: "right" }}>{query.events}</td>
                    <td style={{ ...td, textAlign: "right" }}>{query.submissions}</td>
                    <td style={{ ...td, textAlign: "right" }}>{query.result_views}</td>
                    <td style={{ ...td, textAlign: "right" }}>{query.zero_result_views}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {query.average_results.toFixed(1)}
                    </td>
                    <td style={td}>{formatDate(query.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Zero-Result Queries</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Query</th>
                  <th style={{ ...th, textAlign: "right" }}>Zero Result Views</th>
                  <th style={th}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {data.zero_result_queries.map((query) => (
                  <tr key={query.normalized_query}>
                    <td style={td}>{query.query}</td>
                    <td style={{ ...td, textAlign: "right" }}>{query.zero_result_views}</td>
                    <td style={td}>{formatDate(query.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Recovered Query Performance</div>
            <div style={helperText}>
              These rows show where a zero-result search was rescued by a recovered query, broken
              down by admin override versus analytics fallback.
            </div>
            <div style={{ ...formActions, marginBottom: 12 }}>
              <span style={badge}>
                Override recoveries: {data.summary.override_recovery_views}
              </span>
              <span style={badge}>
                Analytics recoveries: {data.summary.analytics_recovery_views}
              </span>
            </div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Original Query</th>
                  <th style={th}>Recovered Query</th>
                  <th style={th}>Source</th>
                  <th style={{ ...th, textAlign: "right" }}>Recovered Views</th>
                  <th style={{ ...th, textAlign: "right" }}>Avg Results</th>
                  <th style={th}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {data.recovered_queries.length ? (
                  data.recovered_queries.map((query) => (
                    <tr
                      key={[
                        query.original_query,
                        query.recovered_query,
                        query.recovery_source,
                      ].join("-")}
                    >
                      <td style={td}>{query.original_query}</td>
                      <td style={td}>{query.recovered_query}</td>
                      <td style={td}>
                        <span style={badge}>{formatRecoverySource(query.recovery_source)}</span>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{query.recovery_views}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {query.average_results.toFixed(1)}
                      </td>
                      <td style={td}>{formatDate(query.last_seen_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={td} colSpan={6}>
                      No recovered-query performance data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Recent Search Events</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Event</th>
                  <th style={th}>Query</th>
                  <th style={th}>Source</th>
                  <th style={th}>Locale</th>
                  <th style={th}>Country</th>
                  <th style={{ ...th, textAlign: "right" }}>Results</th>
                  <th style={th}>Occurred</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_queries.map((entry, index) => (
                  <tr key={`${entry.event_name}-${entry.occurred_at}-${index}`}>
                    <td style={td}>{entry.event_name.replace(/_/g, " ")}</td>
                    <td style={td}>{entry.query}</td>
                    <td style={td}>{entry.source ?? "-"}</td>
                    <td style={td}>{entry.locale ?? "-"}</td>
                    <td style={td}>{entry.country_code ?? "-"}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {entry.result_count ?? "-"}
                    </td>
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
  label: "Search Analytics",
  icon: SearchIcon,
})

export default SearchAnalyticsPage
