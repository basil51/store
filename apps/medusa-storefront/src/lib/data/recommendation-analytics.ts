"use server"

import { sdk } from "@lib/config"
import { calculateRecommendationAnalyticsBoost } from "@lib/util/product-recommendations"

const RECOMMENDATION_ANALYTICS_REVALIDATE_SECONDS = 300

type RecommendationBoostResponse = {
  source_product_id: string
  rail_views: number
  products: Array<{
    recommended_product_id: string
    clicks: number
    click_through_rate: number
  }>
}

export async function getRecommendationAnalyticsBoosts({
  sourceProductId,
  recommendedProductIds,
}: {
  sourceProductId: string
  recommendedProductIds: string[]
}) {
  const uniqueRecommendedProductIds = [...new Set(recommendedProductIds.filter(Boolean))].slice(
    0,
    24
  )

  if (!sourceProductId || !uniqueRecommendedProductIds.length) {
    return {} as Record<string, number>
  }

  try {
    const data = await sdk.client.fetch<RecommendationBoostResponse>(
      "/store/analytics/recommendation/boosts",
      {
        method: "GET",
        query: {
          source_product_id: sourceProductId,
          product_ids: uniqueRecommendedProductIds.join(","),
          days: 30,
        },
        next: {
          revalidate: RECOMMENDATION_ANALYTICS_REVALIDATE_SECONDS,
        },
        cache: "force-cache",
      }
    )

    return Object.fromEntries(
      (data.products ?? []).map((product) => [
        product.recommended_product_id,
        calculateRecommendationAnalyticsBoost({
          clicks: product.clicks,
          railViews: data.rail_views,
        }),
      ])
    ) as Record<string, number>
  } catch {
    return {} as Record<string, number>
  }
}