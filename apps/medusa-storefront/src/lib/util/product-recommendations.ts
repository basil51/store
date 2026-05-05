export type RecommendationBucket = "collection" | "category" | "tag"

export type RecommendationAnalyticsSample = {
  clicks: number
  railViews: number
}

export type RankedRecommendation<T extends RecommendationProduct> = {
  product: T
  matchedBuckets: RecommendationBucket[]
  score: number
  baseScore: number
  analyticsBoost: number
}

type RecommendationProduct = {
  id: string
}

const BUCKET_WEIGHTS: Record<RecommendationBucket, number> = {
  collection: 6,
  category: 4,
  tag: 2,
}

const MAX_ANALYTICS_BOOST = 1.5

export function calculateRecommendationAnalyticsBoost({
  clicks,
  railViews,
}: RecommendationAnalyticsSample) {
  if (clicks <= 0 || railViews <= 0) {
    return 0
  }

  const boundedClickThroughRate = Math.min(1, clicks / railViews)
  const confidence = Math.min(1, clicks / 2)

  return Number(
    (boundedClickThroughRate * confidence * MAX_ANALYTICS_BOOST).toFixed(4)
  )
}

export function rankRecommendedProducts<T extends RecommendationProduct>({
  sourceProductId,
  buckets,
  analyticsBoosts,
  limit = 4,
}: {
  sourceProductId: string
  buckets: Partial<Record<RecommendationBucket, T[]>>
  analyticsBoosts?: Record<string, number>
  limit?: number
}): T[] {
  return rankRecommendedProductEntries({
    sourceProductId,
    buckets,
    analyticsBoosts,
    limit,
  }).map((entry) => entry.product)
}

export function rankRecommendedProductEntries<T extends RecommendationProduct>({
  sourceProductId,
  buckets,
  analyticsBoosts,
  limit = 4,
}: {
  sourceProductId: string
  buckets: Partial<Record<RecommendationBucket, T[]>>
  analyticsBoosts?: Record<string, number>
  limit?: number
}): RankedRecommendation<T>[] {
  const scored = new Map<
    string,
    {
      product: T
      score: number
      matchCount: number
      firstSeenAt: number
      matchedBuckets: RecommendationBucket[]
    }
  >()
  let firstSeenAt = 0

  for (const bucket of ["collection", "category", "tag"] as const) {
    const products = buckets[bucket] ?? []

    for (const product of products) {
      if (!product?.id || product.id === sourceProductId) {
        continue
      }

      const existing = scored.get(product.id)

      if (existing) {
        existing.score += BUCKET_WEIGHTS[bucket]
        existing.matchCount += 1
        existing.matchedBuckets.push(bucket)
        continue
      }

      scored.set(product.id, {
        product,
        score: BUCKET_WEIGHTS[bucket],
        matchCount: 1,
        firstSeenAt: firstSeenAt++,
        matchedBuckets: [bucket],
      })
    }
  }

  return Array.from(scored.values())
    .sort((left, right) => {
      const leftAnalyticsBoost = analyticsBoosts?.[left.product.id] ?? 0
      const rightAnalyticsBoost = analyticsBoosts?.[right.product.id] ?? 0
      const leftScore = left.score + leftAnalyticsBoost
      const rightScore = right.score + rightAnalyticsBoost

      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      if (right.matchCount !== left.matchCount) {
        return right.matchCount - left.matchCount
      }

      return left.firstSeenAt - right.firstSeenAt
    })
    .slice(0, limit)
    .map((entry) => ({
      product: entry.product,
      matchedBuckets: entry.matchedBuckets,
      score: entry.score + (analyticsBoosts?.[entry.product.id] ?? 0),
      baseScore: entry.score,
      analyticsBoost: analyticsBoosts?.[entry.product.id] ?? 0,
    }))
}