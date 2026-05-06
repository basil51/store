import {
  ensureSearchAnalyticsTable,
  ensureSearchRecoveryOverrideTable,
  insertSearchAnalyticsEvent,
  normalizeSearchAnalyticsEvent,
  normalizeSearchQueryForAnalytics,
  rankSearchRecoveryCandidates,
  selectSearchRecoveryOverride,
  scoreSearchRecoveryCandidate,
} from "../../shared/search-analytics"

const createColumnRecorder = () => {
  const columns: Array<Record<string, unknown>> = []
  const indexes: Array<{ columns: string[]; name: string }> = []

  const addColumn = (
    type: string,
    name: string,
    options?: Record<string, unknown>
  ) => {
    const column: Record<string, unknown> = {
      type,
      name,
      ...options,
    }
    columns.push(column)

    const chain = {
      primary: () => {
        column.primary = true
        return chain
      },
      notNullable: () => {
        column.notNullable = true
        return chain
      },
      nullable: () => {
        column.nullable = true
        return chain
      },
      defaultTo: (value: unknown) => {
        column.defaultTo = value
        return chain
      },
      index: (columnNames: string[], indexName: string) => {
        indexes.push({ columns: columnNames, name: indexName })
        return chain
      },
    }

    return chain
  }

  return {
    columns,
    indexes,
    table: {
      bigIncrements: (name: string) => addColumn("bigIncrements", name),
      string: (name: string, length: number) =>
        addColumn("string", name, { length }),
      integer: (name: string) => addColumn("integer", name),
      jsonb: (name: string) => addColumn("jsonb", name),
      timestamp: (name: string, options: Record<string, unknown>) =>
        addColumn("timestamp", name, { options }),
      index: (columnNames: string[], indexName: string) => {
        indexes.push({ columns: columnNames, name: indexName })
      },
    },
  }
}

const createSchemaDb = () => {
  const recorder = createColumnRecorder()
  const db = {
    fn: {
      now: jest.fn(() => "db-now"),
    },
    schema: {
      hasTable: jest.fn().mockResolvedValue(false),
      createTable: jest.fn(async (_name: string, callback: (table: unknown) => void) => {
        callback(recorder.table)
      }),
    },
  }

  return {
    db,
    ...recorder,
  }
}

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

  it("creates the search analytics table with the expected indexes", async () => {
    const { db, columns, indexes } = createSchemaDb()

    await ensureSearchAnalyticsTable(db)

    expect(db.schema.hasTable).toHaveBeenCalledWith("search_analytics_events")
    expect(db.schema.createTable).toHaveBeenCalledWith(
      "search_analytics_events",
      expect.any(Function)
    )
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "bigIncrements", name: "id", primary: true }),
        expect.objectContaining({ type: "string", name: "event_name", length: 64, notNullable: true }),
        expect.objectContaining({ type: "string", name: "normalized_query", length: 255, notNullable: true }),
        expect.objectContaining({ type: "integer", name: "result_count", nullable: true }),
        expect.objectContaining({ type: "jsonb", name: "payload", notNullable: true }),
        expect.objectContaining({
          type: "timestamp",
          name: "received_at",
          notNullable: true,
          defaultTo: "db-now",
        }),
        expect.objectContaining({ type: "string", name: "ip_address", length: 128, nullable: true }),
      ])
    )
    expect(indexes).toEqual(
      expect.arrayContaining([
        {
          columns: ["event_name", "occurred_at"],
          name: "idx_search_analytics_event_time",
        },
        {
          columns: ["normalized_query", "occurred_at"],
          name: "idx_search_analytics_query_time",
        },
        {
          columns: ["result_count", "occurred_at"],
          name: "idx_search_analytics_results_time",
        },
      ])
    )
  })

  it("creates the search recovery override table with the expected indexes", async () => {
    const { db, columns, indexes } = createSchemaDb()

    await ensureSearchRecoveryOverrideTable(db)

    expect(db.schema.hasTable).toHaveBeenCalledWith("search_recovery_overrides")
    expect(db.schema.createTable).toHaveBeenCalledWith(
      "search_recovery_overrides",
      expect.any(Function)
    )
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "bigIncrements", name: "id", primary: true }),
        expect.objectContaining({ type: "string", name: "normalized_query", length: 255, notNullable: true }),
        expect.objectContaining({ type: "string", name: "target_normalized_query", length: 255, notNullable: true }),
        expect.objectContaining({ type: "string", name: "locale", length: 16, nullable: true }),
        expect.objectContaining({ type: "string", name: "country_code", length: 16, nullable: true }),
        expect.objectContaining({ type: "string", name: "note", length: 512, nullable: true }),
        expect.objectContaining({
          type: "timestamp",
          name: "updated_at",
          notNullable: true,
          defaultTo: "db-now",
        }),
      ])
    )
    expect(indexes).toEqual(
      expect.arrayContaining([
        {
          columns: ["normalized_query"],
          name: "idx_search_recovery_override_query",
        },
        {
          columns: ["locale", "country_code"],
          name: "idx_search_recovery_override_scope",
        },
      ])
    )
  })

  it("maps a normalized storefront submission into the persisted analytics row", async () => {
    const insert = jest.fn().mockResolvedValue(undefined)
    const db = Object.assign(jest.fn(() => ({ insert })), {
      fn: { now: jest.fn() },
    })

    await insertSearchAnalyticsEvent(
      db,
      {
        eventName: "search_submitted",
        query: "Gaming Laptop",
        normalizedQuery: "gaming laptop",
        source: "nav",
        locale: "en",
        countryCode: "il",
        occurredAt: new Date("2026-05-06T12:00:00.000Z"),
        payload: {
          occurred_at: "2026-05-06T12:00:00.000Z",
          query: "Gaming Laptop",
          locale: "en",
          source: "nav",
        },
      },
      {
        requestHost: "store.example",
        requestPath: "/store/analytics/search",
        userAgent: "Playwright",
        ipAddress: "203.0.113.10",
      }
    )

    expect(db).toHaveBeenCalledWith("search_analytics_events")
    expect(insert).toHaveBeenCalledWith({
      event_name: "search_submitted",
      query: "Gaming Laptop",
      normalized_query: "gaming laptop",
      source: "nav",
      locale: "en",
      country_code: "il",
      result_count: undefined,
      payload: {
        occurred_at: "2026-05-06T12:00:00.000Z",
        query: "Gaming Laptop",
        locale: "en",
        source: "nav",
      },
      occurred_at: new Date("2026-05-06T12:00:00.000Z"),
      request_host: "store.example",
      request_path: "/store/analytics/search",
      user_agent: "Playwright",
      ip_address: "203.0.113.10",
    })
  })

  it("maps a recovered search results view into the persisted analytics row", async () => {
    const insert = jest.fn().mockResolvedValue(undefined)
    const db = Object.assign(jest.fn(() => ({ insert })), {
      fn: { now: jest.fn() },
    })

    await insertSearchAnalyticsEvent(
      db,
      {
        eventName: "search_results_viewed",
        query: "Monitor Stand",
        normalizedQuery: "monitor stand",
        source: "store_recovery",
        locale: "en",
        countryCode: "il",
        resultCount: 4,
        occurredAt: new Date("2026-05-06T12:05:00.000Z"),
        payload: {
          occurred_at: "2026-05-06T12:05:00.000Z",
          query: "Monitor Stand",
          locale: "en",
          country_code: "il",
          result_count: 4,
          source: "store_recovery",
          recovery_source: "analytics",
          recovered_from_query: "monitro stand",
          original_result_count: 0,
        },
      },
      {
        requestHost: "store.example",
        requestPath: "/store/analytics/search",
        userAgent: "Playwright",
        ipAddress: "203.0.113.10",
      }
    )

    expect(db).toHaveBeenCalledWith("search_analytics_events")
    expect(insert).toHaveBeenCalledWith({
      event_name: "search_results_viewed",
      query: "Monitor Stand",
      normalized_query: "monitor stand",
      source: "store_recovery",
      locale: "en",
      country_code: "il",
      result_count: 4,
      payload: {
        occurred_at: "2026-05-06T12:05:00.000Z",
        query: "Monitor Stand",
        locale: "en",
        country_code: "il",
        result_count: 4,
        source: "store_recovery",
        recovery_source: "analytics",
        recovered_from_query: "monitro stand",
        original_result_count: 0,
      },
      occurred_at: new Date("2026-05-06T12:05:00.000Z"),
      request_host: "store.example",
      request_path: "/store/analytics/search",
      user_agent: "Playwright",
      ip_address: "203.0.113.10",
    })
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
