import {
  createInMemoryRateLimitStore,
  createIpRateLimit,
  createRedisRateLimitStore,
} from "../middlewares/rate-limit"

describe("store analytics rate limit", () => {
  it("blocks requests above the configured per-IP window", async () => {
    let currentTime = 1_000

    const middleware = createIpRateLimit({
      windowMs: 60_000,
      maxRequests: 2,
      keyPrefix: "test-analytics",
      now: () => currentTime,
      store: createInMemoryRateLimitStore(),
    })

    const makeReq = () =>
      ({
        path: "/store/analytics/preset",
        headers: {
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        },
        ip: "127.0.0.1",
      }) as any

    const makeRes = () => {
      const headers: Record<string, string | number> = {}
      const response = {
        statusCode: 200,
        body: undefined as unknown,
        setHeader: jest.fn((name: string, value: string | number) => {
          headers[name] = value
        }),
        status: jest.fn((code: number) => {
          response.statusCode = code
          return response
        }),
        json: jest.fn((body: unknown) => {
          response.body = body
          return response
        }),
      }

      return { response, headers }
    }

    const nextFirst = jest.fn()
    const firstRes = makeRes()
    await middleware(makeReq(), firstRes.response as any, nextFirst)

    expect(nextFirst).toHaveBeenCalledTimes(1)
    expect(firstRes.headers["X-RateLimit-Limit"]).toBe(2)
    expect(firstRes.headers["X-RateLimit-Remaining"]).toBe(1)

    const nextSecond = jest.fn()
    const secondRes = makeRes()
    await middleware(makeReq(), secondRes.response as any, nextSecond)

    expect(nextSecond).toHaveBeenCalledTimes(1)
    expect(secondRes.headers["X-RateLimit-Remaining"]).toBe(0)

    const nextThird = jest.fn()
    const thirdRes = makeRes()
    await middleware(makeReq(), thirdRes.response as any, nextThird)

    expect(nextThird).not.toHaveBeenCalled()
    expect(thirdRes.response.status).toHaveBeenCalledWith(429)
    expect(thirdRes.headers["Retry-After"]).toBe(60)
    expect(thirdRes.response.body).toEqual({
      message: "Too many requests. Please retry later.",
    })

    currentTime += 60_001

    const nextAfterReset = jest.fn()
    const resetRes = makeRes()
    await middleware(makeReq(), resetRes.response as any, nextAfterReset)

    expect(nextAfterReset).toHaveBeenCalledTimes(1)
    expect(resetRes.headers["X-RateLimit-Remaining"]).toBe(1)
  })

  it("tracks limits independently per route and client IP", async () => {
    const middleware = createIpRateLimit({
      windowMs: 60_000,
      maxRequests: 1,
      keyPrefix: "test-analytics",
      now: () => 5_000,
      store: createInMemoryRateLimitStore(),
    })

    const makeRes = () => {
      const response = {
        status: jest.fn(() => response),
        json: jest.fn(() => response),
        setHeader: jest.fn(),
      }

      return response
    }

    const nextPreset = jest.fn()
    await middleware(
      {
        path: "/store/analytics/preset",
        headers: { "x-forwarded-for": "198.51.100.10" },
      } as any,
      makeRes() as any,
      nextPreset
    )

    const nextWhatsApp = jest.fn()
    await middleware(
      {
        path: "/store/analytics/whatsapp",
        headers: { "x-forwarded-for": "198.51.100.10" },
      } as any,
      makeRes() as any,
      nextWhatsApp
    )

    const nextOtherIp = jest.fn()
    await middleware(
      {
        path: "/store/analytics/preset",
        headers: { "x-forwarded-for": "198.51.100.11" },
      } as any,
      makeRes() as any,
      nextOtherIp
    )

    expect(nextPreset).toHaveBeenCalledTimes(1)
    expect(nextWhatsApp).toHaveBeenCalledTimes(1)
    expect(nextOtherIp).toHaveBeenCalledTimes(1)
  })

  it("maps Redis counter results onto limiter buckets", async () => {
    const evalMock = jest.fn().mockResolvedValue(["3", "1500"])
    const store = createRedisRateLimitStore({
      redisUrl: "redis://127.0.0.1:6380",
      clientFactory: async () => ({
        eval: evalMock,
        on: jest.fn(),
      }),
    })

    await expect(store.increment("test-analytics:key", 60_000, 10_000)).resolves.toEqual({
      count: 3,
      resetAt: 11_500,
    })

    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("INCR", KEYS[1])'),
      1,
      "test-analytics:key",
      "60000"
    )
  })

  it("falls back to in-memory buckets when Redis is unavailable", async () => {
    const fallbackStore = createInMemoryRateLimitStore()
    const store = createRedisRateLimitStore({
      redisUrl: "redis://127.0.0.1:6380",
      fallbackStore,
      clientFactory: async () => ({
        eval: jest.fn().mockRejectedValue(new Error("redis unavailable")),
        on: jest.fn(),
      }),
    })

    await expect(store.increment("test-analytics:key", 60_000, 1_000)).resolves.toEqual({
      count: 1,
      resetAt: 61_000,
    })

    await expect(store.increment("test-analytics:key", 60_000, 1_500)).resolves.toEqual({
      count: 2,
      resetAt: 61_000,
    })
  })
})