import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

jest.mock("../../../../../shared/search-analytics", () => ({
  ensureSearchAnalyticsTable: jest.fn(),
  ensureSearchRecoveryOverrideTable: jest.fn(),
  normalizeSearchQueryForAnalytics: (value: string) => value.trim().toLowerCase(),
  normalizeSearchRecoveryScopeValue: (value?: string | null) =>
    value?.trim().toLowerCase() ?? null,
  SEARCH_ANALYTICS_TABLE: "search_analytics_events",
  SEARCH_RECOVERY_OVERRIDE_TABLE: "search_recovery_overrides",
}))

const searchAnalytics = jest.requireMock("../../../../../shared/search-analytics") as {
  ensureSearchAnalyticsTable: jest.Mock
  ensureSearchRecoveryOverrideTable: jest.Mock
}

import { DELETE, GET, POST } from "../route"

const createRes = () => {
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  }

  return res
}

const createThenableQuery = (result: unknown) => {
  const query: any = {
    select: jest.fn(() => query),
    count: jest.fn(() => query),
    sum: jest.fn(() => query),
    avg: jest.fn(() => query),
    min: jest.fn(() => query),
    max: jest.fn(() => query),
    groupBy: jest.fn(() => query),
    groupByRaw: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    where: jest.fn(() => query),
    whereRaw: jest.fn(() => query),
    whereBetween: jest.fn(() => query),
    first: jest.fn(() => query),
    limit: jest.fn(() => query),
    modify: jest.fn((callback: (builder: unknown) => void) => {
      callback(query)
      return query
    }),
    clone: jest.fn(),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }

  return query
}

const createDb = () => {
  const analyticsResults = [
    [
      { event_name: "search_results_viewed", events: "10" },
      { event_name: "search_submitted", events: "6" },
    ],
    {
      result_views: "10",
      zero_result_views: "4",
      average_results: "2.5",
    },
    [
      {
        query: "Gaming Laptop",
        normalized_query: "gaming laptop",
        events: "8",
        submissions: "3",
        result_views: "5",
        zero_result_views: "1",
        average_results: "4.2",
        last_seen_at: "2026-05-06T12:00:00.000Z",
      },
    ],
    [
      {
        query: "Monitro Stand",
        normalized_query: "monitro stand",
        zero_result_views: "4",
        last_seen_at: "2026-05-06T12:10:00.000Z",
      },
    ],
    [
      {
        event_name: "search_results_viewed",
        query: "Monitor Stand",
        source: "store_recovery",
        locale: "en",
        country_code: "il",
        result_count: "4",
        occurred_at: "2026-05-06T12:11:00.000Z",
      },
      {
        event_name: "search_submitted",
        query: "x",
        source: "nav",
        locale: "en",
        country_code: "il",
        result_count: null,
        occurred_at: "2026-05-06T12:12:00.000Z",
      },
    ],
    {
      total_recovery_views: "3",
      override_recovery_views: "1",
      analytics_recovery_views: "2",
      average_recovered_results: "4.5",
    },
    [
      {
        original_query: "monitro stand",
        recovered_query: "Monitor Stand",
        normalized_query: "monitor stand",
        recovery_source: "analytics",
        recovery_views: "2",
        average_results: "4.5",
        last_seen_at: "2026-05-06T12:11:00.000Z",
      },
      {
        original_query: "labtop",
        recovered_query: "Laptop",
        normalized_query: "laptop",
        recovery_source: "override",
        recovery_views: "1",
        average_results: "5",
        last_seen_at: "2026-05-06T12:09:00.000Z",
      },
    ],
  ]

  const analyticsBaseQuery = createThenableQuery(undefined)
  analyticsBaseQuery.clone.mockImplementation(() =>
    createThenableQuery(analyticsResults.shift())
  )

  const overrideQuery = createThenableQuery([
    {
      id: "7",
      query: "labtop",
      normalized_query: "labtop",
      target_query: "Laptop",
      target_normalized_query: "laptop",
      locale: "en",
      country_code: "il",
      note: "high intent misspelling",
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-06T00:00:00.000Z",
    },
  ])

  const db: any = jest.fn((tableName: string) => {
    if (tableName === "search_analytics_events") {
      return analyticsBaseQuery
    }

    if (tableName === "search_recovery_overrides") {
      return overrideQuery
    }

    throw new Error(`Unexpected table: ${tableName}`)
  })

  db.raw = jest.fn((sql: string) => sql)

  return db
}

const createOverrideLifecycleDb = ({
  operation = "post",
  existingOverride = null,
  listedOverrides = [],
  deleted = 0,
}: {
  operation?: "post" | "delete"
  existingOverride?: Record<string, unknown> | null
  listedOverrides?: Array<Record<string, unknown>>
  deleted?: number
} = {}) => {
  const scopeBuilder = {
    where: jest.fn(() => scopeBuilder),
    whereNull: jest.fn(() => scopeBuilder),
  }

  const existingLookupQuery: any = {
    where: jest.fn(() => existingLookupQuery),
    modify: jest.fn((callback: (builder: typeof scopeBuilder) => void) => {
      callback(scopeBuilder)
      return existingLookupQuery
    }),
    first: jest.fn().mockResolvedValue(existingOverride),
  }

  const updateQuery: any = {
    where: jest.fn(() => updateQuery),
    update: jest.fn().mockResolvedValue(1),
  }

  const insertQuery: any = {
    insert: jest.fn().mockResolvedValue([1]),
  }

  const listQuery = createThenableQuery(listedOverrides)
  const deleteQuery: any = {
    where: jest.fn(() => deleteQuery),
    del: jest.fn().mockResolvedValue(deleted),
  }

  const dbCalls =
    operation === "delete"
      ? [deleteQuery]
      : existingOverride
        ? [existingLookupQuery, updateQuery, listQuery]
        : [existingLookupQuery, insertQuery, listQuery]

  const db: any = jest.fn((tableName: string) => {
    if (tableName !== "search_recovery_overrides") {
      throw new Error(`Unexpected table: ${tableName}`)
    }

    const next = dbCalls.shift()

    if (!next) {
      throw new Error("Unexpected additional recovery override query")
    }

    return next
  })

  return {
    db,
    existingLookupQuery,
    updateQuery,
    insertQuery,
    listQuery,
    deleteQuery,
    scopeBuilder,
  }
}

const createReq = () => {
  const logger = {
    error: jest.fn(),
  }
  const db = createDb()

  const req: any = {
    query: {
      days: "14",
      limit: "5",
    },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === ContainerRegistrationKeys.PG_CONNECTION) {
          return db
        }

        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }

        throw new Error(`Unexpected key: ${key}`)
      }),
    },
  }

  return { req, db, logger }
}

describe("GET /admin/analytics/search", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchAnalytics.ensureSearchAnalyticsTable.mockResolvedValue(undefined)
    searchAnalytics.ensureSearchRecoveryOverrideTable.mockResolvedValue(undefined)
  })

  it("returns recovery summary and recovered queries derived from stored events", async () => {
    const { req } = createReq()
    const res = createRes()

    await GET(req, res)

    expect(searchAnalytics.ensureSearchAnalyticsTable).toHaveBeenCalled()
    expect(searchAnalytics.ensureSearchRecoveryOverrideTable).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({
          total_events: 16,
          total_submissions: 6,
          total_result_views: 10,
          zero_result_views: 4,
          total_recovery_views: 3,
          recovery_view_rate: 75,
          average_recovered_results: 4.5,
          override_recovery_views: 1,
          analytics_recovery_views: 2,
        }),
        recovered_queries: [
          {
            original_query: "monitro stand",
            recovered_query: "Monitor Stand",
            normalized_query: "monitor stand",
            recovery_source: "analytics",
            recovery_views: 2,
            average_results: 4.5,
            last_seen_at: "2026-05-06T12:11:00.000Z",
          },
          {
            original_query: "labtop",
            recovered_query: "Laptop",
            normalized_query: "laptop",
            recovery_source: "override",
            recovery_views: 1,
            average_results: 5,
            last_seen_at: "2026-05-06T12:09:00.000Z",
          },
        ],
        recovery_overrides: [
          {
            id: 7,
            query: "labtop",
            normalized_query: "labtop",
            target_query: "Laptop",
            target_normalized_query: "laptop",
            locale: "en",
            country_code: "il",
            note: "high intent misspelling",
            created_at: "2026-05-01T00:00:00.000Z",
            updated_at: "2026-05-06T00:00:00.000Z",
          },
        ],
        recent_queries: [
          {
            event_name: "search_results_viewed",
            query: "Monitor Stand",
            source: "store_recovery",
            locale: "en",
            country_code: "il",
            result_count: 4,
            occurred_at: "2026-05-06T12:11:00.000Z",
          },
          {
            event_name: "search_submitted",
            query: "x",
            source: "nav",
            locale: "en",
            country_code: "il",
            result_count: null,
            occurred_at: "2026-05-06T12:12:00.000Z",
          },
        ],
      })
    )
  })
})

describe("POST /admin/analytics/search", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchAnalytics.ensureSearchRecoveryOverrideTable.mockResolvedValue(undefined)
  })

  it("creates a new recovery override and returns the latest mapped row", async () => {
    const { db, existingLookupQuery, insertQuery, listQuery, scopeBuilder } =
      createOverrideLifecycleDb({
        operation: "post",
        listedOverrides: [
          {
            id: "9",
            query: "labtop",
            normalized_query: "labtop",
            target_query: "Laptop",
            target_normalized_query: "laptop",
            locale: "en",
            country_code: "il",
            note: "high intent misspelling",
            created_at: "2026-05-06T12:00:00.000Z",
            updated_at: "2026-05-06T12:00:00.000Z",
          },
        ],
      })
    const res = createRes()
    const req: any = {
      body: {
        query: " labtop ",
        target_query: " Laptop ",
        locale: " EN ",
        country_code: " IL ",
        note: " high intent misspelling ",
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          if (key === ContainerRegistrationKeys.LOGGER) {
            return { error: jest.fn() }
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }

    await POST(req, res)

    expect(searchAnalytics.ensureSearchRecoveryOverrideTable).toHaveBeenCalledWith(db)
    expect(existingLookupQuery.where).toHaveBeenCalledWith("normalized_query", "labtop")
    expect(scopeBuilder.where).toHaveBeenCalledWith("locale", "en")
    expect(scopeBuilder.where).toHaveBeenCalledWith("country_code", "il")
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "labtop",
        normalized_query: "labtop",
        target_query: "Laptop",
        target_normalized_query: "laptop",
        locale: "en",
        country_code: "il",
        note: "high intent misspelling",
        created_at: expect.any(String),
        updated_at: expect.any(String),
      })
    )
    expect(listQuery.limit).toHaveBeenCalledWith(1)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      recovery_override: {
        id: 9,
        query: "labtop",
        normalized_query: "labtop",
        target_query: "Laptop",
        target_normalized_query: "laptop",
        locale: "en",
        country_code: "il",
        note: "high intent misspelling",
        created_at: "2026-05-06T12:00:00.000Z",
        updated_at: "2026-05-06T12:00:00.000Z",
      },
    })
  })

  it("updates an existing scoped recovery override when normalized query and scope already exist", async () => {
    const { db, updateQuery, insertQuery, scopeBuilder } = createOverrideLifecycleDb({
      operation: "post",
      existingOverride: { id: 7 },
      listedOverrides: [
        {
          id: "7",
          query: "labtop",
          normalized_query: "labtop",
          target_query: "Gaming Laptop",
          target_normalized_query: "gaming laptop",
          locale: null,
          country_code: null,
          note: null,
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-06T12:30:00.000Z",
        },
      ],
    })
    const res = createRes()
    const req: any = {
      body: {
        query: "labtop",
        target_query: "Gaming Laptop",
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          if (key === ContainerRegistrationKeys.LOGGER) {
            return { error: jest.fn() }
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }

    await POST(req, res)

    expect(scopeBuilder.whereNull).toHaveBeenCalledWith("locale")
    expect(scopeBuilder.whereNull).toHaveBeenCalledWith("country_code")
    expect(updateQuery.where).toHaveBeenCalledWith("id", 7)
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "labtop",
        normalized_query: "labtop",
        target_query: "Gaming Laptop",
        target_normalized_query: "gaming laptop",
        locale: null,
        country_code: null,
        note: null,
        updated_at: expect.any(String),
      })
    )
    expect(insertQuery.insert).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("rejects overrides whose query and target normalize to the same value", async () => {
    const { db, insertQuery, updateQuery } = createOverrideLifecycleDb({
      operation: "post",
    })
    const res = createRes()
    const req: any = {
      body: {
        query: "Monitor Stand",
        target_query: " monitor stand ",
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          if (key === ContainerRegistrationKeys.LOGGER) {
            return { error: jest.fn() }
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }

    await POST(req, res)

    expect(insertQuery.insert).not.toHaveBeenCalled()
    expect(updateQuery.update).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "query and target_query must resolve to different normalized values.",
    })
  })
})

describe("DELETE /admin/analytics/search", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchAnalytics.ensureSearchRecoveryOverrideTable.mockResolvedValue(undefined)
  })

  it("requires an id before deleting an override", async () => {
    const { db } = createOverrideLifecycleDb({ operation: "delete" })
    const res = createRes()
    const req: any = {
      query: {},
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          if (key === ContainerRegistrationKeys.LOGGER) {
            return { error: jest.fn() }
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }

    await DELETE(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: "id is required." })
  })

  it("returns the deleted id when an override is removed", async () => {
    const { db, deleteQuery } = createOverrideLifecycleDb({
      operation: "delete",
      deleted: 1,
    })
    const res = createRes()
    const req: any = {
      query: { id: "7" },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          if (key === ContainerRegistrationKeys.LOGGER) {
            return { error: jest.fn() }
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }

    await DELETE(req, res)

    expect(deleteQuery.where).toHaveBeenCalledWith("id", 7)
    expect(deleteQuery.del).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ id: 7 })
  })

  it("returns 404 when the override does not exist", async () => {
    const { db } = createOverrideLifecycleDb({
      operation: "delete",
      deleted: 0,
    })
    const res = createRes()
    const req: any = {
      query: { id: "999" },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          if (key === ContainerRegistrationKeys.LOGGER) {
            return { error: jest.fn() }
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }

    await DELETE(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "Recovery override not found." })
  })
})