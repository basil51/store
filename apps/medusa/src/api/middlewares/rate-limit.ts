import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

type RateLimitOptions = {
  windowMs: number
  maxRequests: number
  keyPrefix: string
  now?: () => number
  store?: RateLimitStore
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

type RateLimitStore = {
  increment: (
    key: string,
    windowMs: number,
    currentTime: number
  ) => Promise<RateLimitBucket>
}

type RedisRateLimitClient = {
  eval: (
    script: string,
    numKeys: number,
    key: string,
    windowMs: string
  ) => Promise<[unknown, unknown]>
  on?: (event: string, listener: (error: unknown) => void) => void
}

type RedisRateLimitStoreOptions = {
  redisUrl: string
  fallbackStore?: RateLimitStore
  clientFactory?: () => Promise<RedisRateLimitClient>
}

const DEFAULT_ANALYTICS_WINDOW_MS = Math.max(
  1_000,
  Number.parseInt(process.env.STORE_ANALYTICS_RATE_LIMIT_WINDOW_MS ?? "60000", 10) ||
    60_000
)

const DEFAULT_ANALYTICS_MAX_REQUESTS = Math.max(
  1,
  Number.parseInt(process.env.STORE_ANALYTICS_RATE_LIMIT_MAX_REQUESTS ?? "60", 10) || 60
)

const RATE_LIMIT_REDIS_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`

const readHeader = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

const resolveClientIp = (req: MedusaRequest) => {
  const forwardedFor = readHeader(req.headers?.["x-forwarded-for"])
  const forwardedIp = forwardedFor?.split(",")[0]?.trim()

  if (forwardedIp) {
    return forwardedIp
  }

  const realIp = readHeader(req.headers?.["x-real-ip"])
  if (realIp) {
    return realIp
  }

  return readHeader(req.ip) ?? "unknown"
}

const resolvePathname = (req: MedusaRequest) => {
  const rawPath = req.path ?? req.url ?? ""
  const pathname = rawPath.split("?")[0] ?? ""

  if (!pathname) {
    return "unknown"
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`
}

const setRateLimitHeaders = (
  res: MedusaResponse,
  maxRequests: number,
  remaining: number,
  resetAt: number
) => {
  const response = res as MedusaResponse & {
    setHeader?: (name: string, value: string | number) => void
  }

  response.setHeader?.("X-RateLimit-Limit", maxRequests)
  response.setHeader?.("X-RateLimit-Remaining", remaining)
  response.setHeader?.("X-RateLimit-Reset", Math.ceil(resetAt / 1000))
}

const pruneExpiredBuckets = (buckets: Map<string, RateLimitBucket>, now: number) => {
  if (buckets.size < 1_000) {
    return
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

const normalizeRedisNumber = (value: unknown) => {
  const normalized =
    typeof value === "number"
      ? value
      : Number.parseInt(typeof value === "string" ? value : "", 10)

  if (!Number.isFinite(normalized)) {
    throw new Error("Redis rate limit store returned a non-numeric value.")
  }

  return normalized
}

export const createInMemoryRateLimitStore = (): RateLimitStore => {
  const buckets = new Map<string, RateLimitBucket>()

  return {
    increment: async (key, windowMs, currentTime) => {
      pruneExpiredBuckets(buckets, currentTime)

      const current = buckets.get(key)
      const bucket =
        !current || current.resetAt <= currentTime
          ? { count: 0, resetAt: currentTime + windowMs }
          : current

      bucket.count += 1
      buckets.set(key, bucket)

      return bucket
    },
  }
}

export const createRedisRateLimitStore = ({
  redisUrl,
  fallbackStore,
  clientFactory,
}: RedisRateLimitStoreOptions): RateLimitStore => {
  let redisClientPromise: Promise<RedisRateLimitClient> | null = null
  let hasWarnedOnFallback = false

  const warnOnFallback = (error: unknown) => {
    if (hasWarnedOnFallback || !fallbackStore) {
      return
    }

    hasWarnedOnFallback = true
    console.warn(
      "Redis-backed analytics rate limiting is unavailable; falling back to in-memory buckets.",
      error
    )
  }

  const getRedisClient = async () => {
    if (!redisClientPromise) {
      redisClientPromise = (clientFactory
        ? clientFactory()
        : import("ioredis").then(({ default: Redis }) => {
            const client = new Redis(redisUrl)
            client.on?.("error", () => undefined)
            return client as RedisRateLimitClient
          }))
    }

    return redisClientPromise
  }

  return {
    increment: async (key, windowMs, currentTime) => {
      try {
        const redisClient = await getRedisClient()
        const [countValue, ttlValue] = await redisClient.eval(
          RATE_LIMIT_REDIS_SCRIPT,
          1,
          key,
          String(windowMs)
        )
        const ttlMs = Math.max(1, normalizeRedisNumber(ttlValue))

        return {
          count: normalizeRedisNumber(countValue),
          resetAt: currentTime + ttlMs,
        }
      } catch (error) {
        if (!fallbackStore) {
          throw error
        }

        warnOnFallback(error)
        return fallbackStore.increment(key, windowMs, currentTime)
      }
    },
  }
}

let analyticsRateLimitStore: RateLimitStore | null = null

const getAnalyticsRateLimitStore = () => {
  if (analyticsRateLimitStore) {
    return analyticsRateLimitStore
  }

  const redisUrl = process.env.REDIS_URL?.trim()

  if (!redisUrl) {
    analyticsRateLimitStore = createInMemoryRateLimitStore()
    return analyticsRateLimitStore
  }

  analyticsRateLimitStore = createRedisRateLimitStore({
    redisUrl,
    fallbackStore: createInMemoryRateLimitStore(),
  })

  return analyticsRateLimitStore
}

export const createIpRateLimit = ({
  windowMs,
  maxRequests,
  keyPrefix,
  now = () => Date.now(),
  store = createInMemoryRateLimitStore(),
}: RateLimitOptions) => {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const currentTime = now()

    const key = `${keyPrefix}:${resolvePathname(req)}:${resolveClientIp(req)}`
    const bucket = await store.increment(key, windowMs, currentTime)

    const remaining = Math.max(0, maxRequests - bucket.count)
    setRateLimitHeaders(res, maxRequests, remaining, bucket.resetAt)

    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000))
      ;(res as MedusaResponse & {
        setHeader?: (name: string, value: string | number) => void
      }).setHeader?.("Retry-After", retryAfterSeconds)

      return res.status(429).json({
        message: "Too many requests. Please retry later.",
      })
    }

    next()
  }
}

export const analyticsRateLimit = createIpRateLimit({
  windowMs: DEFAULT_ANALYTICS_WINDOW_MS,
  maxRequests: DEFAULT_ANALYTICS_MAX_REQUESTS,
  keyPrefix: "store-analytics",
  store: getAnalyticsRateLimitStore(),
})