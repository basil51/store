import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

jest.mock('../../../../../shared/search-analytics', () => ({
  ensureSearchAnalyticsTable: jest.fn(),
  insertSearchAnalyticsEvent: jest.fn(),
  normalizeSearchAnalyticsEvent: jest.fn(),
}))

const searchAnalytics = jest.requireMock('../../../../../shared/search-analytics') as {
  ensureSearchAnalyticsTable: jest.Mock
  insertSearchAnalyticsEvent: jest.Mock
  normalizeSearchAnalyticsEvent: jest.Mock
}

import { POST } from "../route"

const createRes = () => {
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  }

  return res
}

const createReq = (overrides?: Partial<Record<string, unknown>>) => {
  const logger = {
    error: jest.fn(),
  }
  const db = { name: "pg" }

  const req: any = {
    body: {
      event_name: "search_results_viewed",
      payload: { query: "Gaming Laptop", result_count: 3 },
    },
    headers: {
      host: "store.example ",
      "user-agent": " Vitest Browser ",
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    },
    ip: "127.0.0.1",
    path: "/store/analytics/search",
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }

        if (key === ContainerRegistrationKeys.PG_CONNECTION) {
          return db
        }

        throw new Error(`Unexpected key: ${key}`)
      }),
    },
    ...overrides,
  }

  return { req, logger, db }
}

describe("POST /store/analytics/search", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchAnalytics.normalizeSearchAnalyticsEvent.mockReturnValue({
      value: {
        eventName: "search_results_viewed",
        query: "Gaming Laptop",
        normalizedQuery: "gaming laptop",
        resultCount: 3,
        locale: "en",
        countryCode: "us",
        source: "store",
        occurredAt: new Date("2026-05-06T12:00:00.000Z"),
        payload: { query: "Gaming Laptop", result_count: 3 },
      },
    })
    searchAnalytics.ensureSearchAnalyticsTable.mockResolvedValue(undefined)
    searchAnalytics.insertSearchAnalyticsEvent.mockResolvedValue(undefined)
  })

  it("rejects invalid analytics payloads before touching the database", async () => {
    searchAnalytics.normalizeSearchAnalyticsEvent.mockReturnValue({
      error: "payload.query is required.",
    })
    const { req, db } = createReq()
    const res = createRes()

    await POST(req, res)

    expect(searchAnalytics.normalizeSearchAnalyticsEvent).toHaveBeenCalledWith(req.body)
    expect(req.scope.resolve).not.toHaveBeenCalledWith(ContainerRegistrationKeys.LOGGER)
    expect(req.scope.resolve).not.toHaveBeenCalledWith(ContainerRegistrationKeys.PG_CONNECTION)
    expect(searchAnalytics.ensureSearchAnalyticsTable).not.toHaveBeenCalledWith(db)
    expect(searchAnalytics.insertSearchAnalyticsEvent).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "payload.query is required.",
    })
  })

  it("persists normalized events with forwarded request context", async () => {
    const { req, db } = createReq()
    const res = createRes()

    await POST(req, res)

    expect(searchAnalytics.ensureSearchAnalyticsTable).toHaveBeenCalledWith(db)
    expect(searchAnalytics.insertSearchAnalyticsEvent).toHaveBeenCalledWith(
      db,
      {
        eventName: "search_results_viewed",
        query: "Gaming Laptop",
        normalizedQuery: "gaming laptop",
        resultCount: 3,
        locale: "en",
        countryCode: "us",
        source: "store",
        occurredAt: new Date("2026-05-06T12:00:00.000Z"),
        payload: { query: "Gaming Laptop", result_count: 3 },
      },
      {
        requestHost: "store.example",
        requestPath: "/store/analytics/search",
        userAgent: "Vitest Browser",
        ipAddress: "203.0.113.10",
      }
    )
    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.json).toHaveBeenCalledWith({ accepted: true })
  })

  it("falls back to req.ip when no forwarded header is present", async () => {
    const { req, db } = createReq({
      headers: {
        host: "store.example",
        "user-agent": "Vitest Browser",
      },
      ip: "198.51.100.7 ",
    })
    const res = createRes()

    await POST(req, res)

    expect(searchAnalytics.insertSearchAnalyticsEvent).toHaveBeenCalledWith(
      db,
      expect.any(Object),
      expect.objectContaining({
        ipAddress: "198.51.100.7",
      })
    )
  })

  it("logs and returns 500 when storing the analytics event fails", async () => {
    const error = new Error("insert failed")
    searchAnalytics.insertSearchAnalyticsEvent.mockRejectedValueOnce(error)
    const { req, logger } = createReq()
    const res = createRes()

    await POST(req, res)

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to store search analytics event",
      {
        message: "insert failed",
        event: "search_results_viewed",
      }
    )
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to store analytics event.",
    })
  })
})