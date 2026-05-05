import { getRecommendationAnalyticsBoosts } from "@lib/data/recommendation-analytics"
import { listProducts } from "@lib/data/products"
import { getStorefrontSettings } from "@lib/data/currency"
import { getRegion } from "@lib/data/regions"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import {
  type RankedRecommendation,
  rankRecommendedProductEntries,
} from "@lib/util/product-recommendations"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"
import RelatedProductsAnalytics from "./analytics"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

const getRecommendationReason = (
  recommendation: RankedRecommendation<HttpTypes.StoreProduct>,
  t: (key: Parameters<typeof getUiCopy>[1]) => string
) => {
  if (recommendation.matchedBuckets.length > 1) {
    return t("relatedProductsReasonMultiSignal")
  }

  switch (recommendation.matchedBuckets[0]) {
    case "collection":
      return t("relatedProductsReasonCollection")
    case "category":
      return t("relatedProductsReasonCategory")
    case "tag":
      return t("relatedProductsReasonTag")
    default:
      return null
  }
}

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  const relatedProductsLimit = 4
  const recommendationBucketLimit = 8
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const storeSettings = await getStorefrontSettings()

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const categoryIds = (product.categories ?? [])
    .map((category) => category.id)
    .filter(Boolean) as string[]
  const tagIds = (product.tags ?? [])
    .map((tag) => tag.id)
    .filter(Boolean) as string[]
  const baseQueryParams: HttpTypes.StoreProductListParams = {
    is_giftcard: false,
    limit: recommendationBucketLimit,
  }

  const [collectionProducts, categoryProducts, tagProducts, fallbackProducts] =
    await Promise.all([
      product.collection_id
        ? listProducts({
            countryCode,
            queryParams: {
              ...baseQueryParams,
              collection_id: [product.collection_id],
            },
          }).then(({ response }) => response.products)
        : Promise.resolve([]),
      categoryIds.length
        ? listProducts({
            countryCode,
            queryParams: {
              ...baseQueryParams,
              category_id: categoryIds,
            },
          }).then(({ response }) => response.products)
        : Promise.resolve([]),
      tagIds.length
        ? listProducts({
            countryCode,
            queryParams: {
              ...baseQueryParams,
              tag_id: tagIds,
            },
          }).then(({ response }) => response.products)
        : Promise.resolve([]),
      listProducts({
        countryCode,
        queryParams: baseQueryParams,
      }).then(({ response }) => response.products),
    ])

  const analyticsBoosts = await getRecommendationAnalyticsBoosts({
    sourceProductId: product.id,
    recommendedProductIds: [
      ...collectionProducts,
      ...categoryProducts,
      ...tagProducts,
    ].map((recommendedProduct) => recommendedProduct.id),
  })

  const rankedRecommendations = rankRecommendedProductEntries({
    sourceProductId: product.id,
    buckets: {
      collection: collectionProducts,
      category: categoryProducts,
      tag: tagProducts,
    },
    analyticsBoosts,
    limit: relatedProductsLimit,
  })

  const seenProductIds = new Set(
    rankedRecommendations.map((recommendation) => recommendation.product.id)
  )
  const recommendations = [...rankedRecommendations]

  for (const fallbackProduct of fallbackProducts) {
    if (
      recommendations.length >= relatedProductsLimit ||
      fallbackProduct.id === product.id ||
      seenProductIds.has(fallbackProduct.id)
    ) {
      continue
    }

    seenProductIds.add(fallbackProduct.id)
    recommendations.push({
      product: fallbackProduct,
      matchedBuckets: [],
      score: 0,
    })
  }

  if (!recommendations.length) {
    return null
  }

  return (
    <RelatedProductsAnalytics
      countryCode={countryCode}
      locale={locale}
      sourceProduct={{
        id: product.id,
        handle: product.handle,
        title: product.title,
      }}
      recommendedProducts={recommendations.map((recommendation) => ({
        id: recommendation.product.id,
        handle: recommendation.product.handle,
        title: recommendation.product.title,
      }))}
    >
      <div className="product-page-constraint">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-base-regular text-gray-600 mb-6">
            {t("relatedProductsTitle")}
          </span>
          <p className="text-2xl-regular text-ui-fg-base max-w-lg">
            {t("relatedProductsSubtitle")}
          </p>
        </div>

        <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
          {recommendations.map((recommendation, index) => {
            const recommendedProduct = recommendation.product
            const recommendationReason = getRecommendationReason(recommendation, t)

            return (
            <li
              key={recommendedProduct.id}
              data-recommendation-product-id={recommendedProduct.id}
              data-recommendation-product-handle={recommendedProduct.handle}
              data-recommendation-product-title={recommendedProduct.title}
              data-recommendation-slot={index + 1}
              className="space-y-3"
            >
              {recommendationReason && (
                <span
                  className="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{
                    background: "color-mix(in srgb, var(--teal) 14%, transparent)",
                    color: "var(--teal)",
                    border: "1px solid color-mix(in srgb, var(--teal) 24%, transparent)",
                  }}
                >
                  {recommendationReason}
                </span>
              )}
              <Product
                region={region}
                product={recommendedProduct}
                defaultStockMode={storeSettings.defaultStockMode}
              />
            </li>
            )
          })}
        </ul>
      </div>
    </RelatedProductsAnalytics>
  )
}
