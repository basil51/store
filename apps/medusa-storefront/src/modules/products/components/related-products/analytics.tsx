"use client"

import {
  trackRecommendationProductClicked,
  trackRecommendationRailViewed,
} from "@lib/util/analytics"
import { useEffect, useRef } from "react"

type RelatedProductsAnalyticsProps = {
  children: React.ReactNode
  countryCode: string
  locale: string
  sourceProduct: {
    id: string
    handle?: string | null
    title?: string | null
  }
  recommendedProducts: Array<{
    id: string
    handle?: string | null
    title?: string | null
  }>
}

export default function RelatedProductsAnalytics({
  children,
  countryCode,
  locale,
  sourceProduct,
  recommendedProducts,
}: RelatedProductsAnalyticsProps) {
  const hasTrackedView = useRef(false)

  useEffect(() => {
    if (hasTrackedView.current || !recommendedProducts.length) {
      return
    }

    hasTrackedView.current = true

    trackRecommendationRailViewed({
      rail: "related_products",
      source_product_id: sourceProduct.id,
      source_product_handle: sourceProduct.handle ?? undefined,
      source_product_title: sourceProduct.title ?? undefined,
      recommended_count: recommendedProducts.length,
      recommended_product_ids: recommendedProducts.map((product) => product.id),
      locale,
      country_code: countryCode,
    })
  }, [countryCode, locale, recommendedProducts, sourceProduct])

  return (
    <div
      onClickCapture={(event) => {
        const target = event.target as HTMLElement | null
        const item = target?.closest<HTMLElement>("[data-recommendation-product-id]")

        if (!item) {
          return
        }

        const productId = item.dataset.recommendationProductId

        if (!productId) {
          return
        }

        trackRecommendationProductClicked({
          rail: "related_products",
          source_product_id: sourceProduct.id,
          source_product_handle: sourceProduct.handle ?? undefined,
          source_product_title: sourceProduct.title ?? undefined,
          recommended_count: recommendedProducts.length,
          recommended_product_id: productId,
          recommended_product_handle: item.dataset.recommendationProductHandle,
          recommended_product_title: item.dataset.recommendationProductTitle,
          recommendation_slot: Number(item.dataset.recommendationSlot ?? "0") || undefined,
          locale,
          country_code: countryCode,
        })
      }}
    >
      {children}
    </div>
  )
}