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
}

type RateLimitBucket = {
  count: number
  resetAt: number
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

export const createIpRateLimit = ({
  windowMs,
  maxRequests,
  keyPrefix,
  now = () => Date.now(),
}: RateLimitOptions) => {
  const buckets = new Map<string, RateLimitBucket>()

  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const currentTime = now()
    pruneExpiredBuckets(buckets, currentTime)

    const key = `${keyPrefix}:${resolvePathname(req)}:${resolveClientIp(req)}`
    const current = buckets.get(key)
    const bucket =
      !current || current.resetAt <= currentTime
        ? { count: 0, resetAt: currentTime + windowMs }
        : current

    bucket.count += 1
    buckets.set(key, bucket)

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
})