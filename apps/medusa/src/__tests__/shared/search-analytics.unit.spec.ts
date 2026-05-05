import {
  normalizeSearchAnalyticsEvent,
  normalizeSearchQueryForAnalytics,
  rankSearchRecoveryCandidates,
  selectSearchRecoveryOverride,
  scoreSearchRecoveryCandidate,
} from "../../shared/search-analytics"

describe("search analytics normalization", () => {
  it("normalizes accepted search submissions", () => {
    const result = normalizeSearchAnalyticsEvent({
      event_name: "search_submitted",
      payload: {
        query: "  Gaming   Laptop  ",
        source: "nav",
        locale: "en",
      },
    })

    expect("value" in result).toBe(true)

    if ("value" in result) {
      expect(result.value.query).toBe("Gaming Laptop")
      expect(result.value.normalizedQuery).toBe("gaming laptop")
      expect(result.value.source).toBe("nav")
    }
  })

  it("requires result counts for search result views", () => {
    expect(
      normalizeSearchAnalyticsEvent({
        event_name: "search_results_viewed",
        payload: { query: "monitor" },
      })
    ).toEqual({
      error: "payload.result_count is required for search_results_viewed.",
    })
  })

  it("rejects negative result counts", () => {
    expect(
      normalizeSearchAnalyticsEvent({
        event_name: "search_results_viewed",
        payload: { query: "monitor", result_count: -1 },
      })
    ).toEqual({
      error: "payload.result_count must be zero or greater when provided.",
    })
  })

  it("bounds normalized query strings", () => {
    expect(normalizeSearchQueryForAnalytics("x".repeat(300))).toHaveLength(255)
  })

  it("scores overlapping successful queries above unrelated queries", () => {
    expect(
      scoreSearchRecoveryCandidate("gaming labtop", {
        query: "Gaming Laptop",
        normalizedQuery: "gaming laptop",
        resultViews: 12,
        averageResults: 5,
      })
    ).toBeGreaterThan(
      scoreSearchRecoveryCandidate("gaming labtop", {
        query: "Wireless Mouse",
        normalizedQuery: "wireless mouse",
        resultViews: 30,
        averageResults: 8,
      })
    )
  })

  it("ranks recovery candidates by similarity and success signals", () => {
    const ranked = rankSearchRecoveryCandidates("iphon", [
      {
        query: "iPhone",
        normalizedQuery: "iphone",
        resultViews: 20,
        averageResults: 4,
      },
      {
        query: "Phone Case",
        normalizedQuery: "phone case",
        resultViews: 40,
        averageResults: 7,
      },
      {
        query: "Gaming Laptop",
        normalizedQuery: "gaming laptop",
        resultViews: 60,
        averageResults: 8,
      },
    ])

    expect(ranked[0]?.normalizedQuery).toBe("iphone")
    expect(ranked.map((entry) => entry.normalizedQuery)).not.toContain("gaming laptop")
  })

  it("prefers scoped recovery overrides over global ones", () => {
    const selected = selectSearchRecoveryOverride(
      "labtop",
      [
        {
          query: "labtop",
          normalizedQuery: "labtop",
          targetQuery: "Laptop",
          targetNormalizedQuery: "laptop",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          query: "labtop",
          normalizedQuery: "labtop",
          targetQuery: "Gaming Laptop",
          targetNormalizedQuery: "gaming laptop",
          locale: "en",
          countryCode: "us",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      { locale: "en", countryCode: "us" }
    )

    expect(selected?.targetNormalizedQuery).toBe("gaming laptop")
  })

  it("falls back to a global recovery override when scoped entries do not match", () => {
    const selected = selectSearchRecoveryOverride(
      "labtop",
      [
        {
          query: "labtop",
          normalizedQuery: "labtop",
          targetQuery: "Laptop",
          targetNormalizedQuery: "laptop",
          updatedAt: "2026-01-03T00:00:00.000Z",
        },
        {
          query: "labtop",
          normalizedQuery: "labtop",
          targetQuery: "Ordinateur Portable",
          targetNormalizedQuery: "ordinateur portable",
          locale: "fr",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      { locale: "en", countryCode: "us" }
    )

    expect(selected?.targetNormalizedQuery).toBe("laptop")
  })
})
