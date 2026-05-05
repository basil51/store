import { getBaseURL } from "@lib/util/env"
import { HttpTypes } from "@medusajs/types"

type RegionLike = {
  countries?: { iso_2?: string | null }[] | null
}

type LocaleLike = {
  code?: string | null
}

type CategoryLike = {
  handle?: string | null
  name?: string | null
  parent_category?: CategoryLike | null
}

type BreadcrumbItem = {
  name: string
  item: string
}

type ItemListEntry = {
  name: string
  item: string
}

type StructuredDataRecord = Record<string, unknown>

const DEFAULT_METADATA_IMAGE_KEYS = [
  "og_image",
  "open_graph_image",
  "image",
  "image_url",
  "thumbnail",
  "logo",
] as const

const DEFAULT_PRODUCT_BRAND_KEYS = [
  "brand",
  "brand_name",
  "manufacturer",
  "maker",
] as const

const DEFAULT_PRODUCT_REVIEW_RATING_KEYS = [
  "rating_value",
  "review_rating",
  "average_rating",
  "rating",
] as const

const DEFAULT_PRODUCT_REVIEW_COUNT_KEYS = [
  "review_count",
  "rating_count",
  "ratings_count",
  "review_total",
] as const

export const DEFAULT_OPEN_GRAPH_IMAGE_PATH = "/opengraph-image.jpg"
export const DEFAULT_TWITTER_IMAGE_PATH = "/twitter-image.jpg"

export const getSeoBaseUrl = () => getBaseURL().replace(/\/+$/, "")

export const buildCanonicalUrl = (path = "") => {
  const normalizedPath = path.replace(/^\/+/, "")
  return normalizedPath
    ? `${getSeoBaseUrl()}/${normalizedPath}`
    : getSeoBaseUrl()
}

export const buildAbsoluteSeoImageUrl = (image?: string | null) => {
  const normalizedImage = image?.trim()

  if (!normalizedImage) {
    return buildCanonicalUrl(DEFAULT_OPEN_GRAPH_IMAGE_PATH)
  }

  try {
    return new URL(normalizedImage).toString()
  } catch {
    return buildCanonicalUrl(normalizedImage)
  }
}

export const getDefaultOpenGraphImage = (alt = "NEXMART") => ({
  url: buildCanonicalUrl(DEFAULT_OPEN_GRAPH_IMAGE_PATH),
  alt,
  width: 1200,
  height: 630,
})

export const getDefaultTwitterImage = () =>
  buildCanonicalUrl(DEFAULT_TWITTER_IMAGE_PATH)

export const getOpenGraphImage = (image?: string | null, alt = "NEXMART") => ({
  url: buildAbsoluteSeoImageUrl(image),
  alt,
  width: 1200,
  height: 630,
})

export const getTwitterImage = (image?: string | null) =>
  image ? buildAbsoluteSeoImageUrl(image) : getDefaultTwitterImage()

export const serializeStructuredData = (
  input: StructuredDataRecord | StructuredDataRecord[]
) => JSON.stringify(input).replace(/</g, "\\u003c")

const getSeoMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[],
  maxLength = 255
) => {
  if (!metadata) {
    return null
  }

  for (const key of keys) {
    const value = metadata[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, maxLength)
    }
  }

  return null
}

const getSeoMetadataNumber = (
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[]
) => {
  if (!metadata) {
    return null
  }

  for (const key of keys) {
    const value = metadata[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string") {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

const buildProductReviewStructuredData = (
  metadata: Record<string, unknown> | null | undefined
) => {
  const rawReviews = metadata?.reviews

  if (!Array.isArray(rawReviews)) {
    return [] as StructuredDataRecord[]
  }

  return rawReviews
    .flatMap((rawReview) => {
      if (!rawReview || typeof rawReview !== "object" || Array.isArray(rawReview)) {
        return []
      }

      const review = rawReview as Record<string, unknown>
      const author = getSeoMetadataString(review, ["author", "author_name", "name"])
      const reviewBody = getSeoMetadataString(review, [
        "review_body",
        "body",
        "text",
        "content",
      ], 2000)
      const ratingValue = getSeoMetadataNumber(review, [
        "rating_value",
        "rating",
        "score",
      ])
      const datePublished = getSeoMetadataString(review, [
        "published_at",
        "date_published",
        "date",
      ], 64)

      if (!author && !reviewBody && ratingValue == null) {
        return []
      }

      return [
        {
          "@type": "Review",
          ...(author
            ? {
                author: {
                  "@type": "Person",
                  name: author,
                },
              }
            : {}),
          ...(reviewBody ? { reviewBody } : {}),
          ...(ratingValue != null
            ? {
                reviewRating: {
                  "@type": "Rating",
                  ratingValue,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
          ...(datePublished ? { datePublished } : {}),
        },
      ]
    })
    .slice(0, 5)
}

const buildProductAggregateRatingStructuredData = (
  metadata: Record<string, unknown> | null | undefined,
  reviews: StructuredDataRecord[]
) => {
  const explicitRatingValue = getSeoMetadataNumber(
    metadata,
    DEFAULT_PRODUCT_REVIEW_RATING_KEYS
  )
  const explicitReviewCount = getSeoMetadataNumber(
    metadata,
    DEFAULT_PRODUCT_REVIEW_COUNT_KEYS
  )
  const reviewRatings = reviews
    .map((review) => {
      const reviewRating = review.reviewRating

      if (!reviewRating || typeof reviewRating !== "object" || Array.isArray(reviewRating)) {
        return null
      }

      const ratingValue = (reviewRating as Record<string, unknown>).ratingValue

      return typeof ratingValue === "number" && Number.isFinite(ratingValue)
        ? ratingValue
        : null
    })
    .filter((value): value is number => value != null)

  const ratingValue =
    explicitRatingValue ??
    (reviewRatings.length
      ? reviewRatings.reduce((sum, value) => sum + value, 0) / reviewRatings.length
      : null)
  const reviewCount = explicitReviewCount ?? (reviews.length || null)

  if (ratingValue == null || reviewCount == null || reviewCount <= 0) {
    return null
  }

  return {
    "@type": "AggregateRating",
    ratingValue: Number(ratingValue.toFixed(2)),
    reviewCount,
    bestRating: 5,
    worstRating: 1,
  }
}

const buildProductIdentifierStructuredData = (
  metadata: Record<string, unknown> | null | undefined
) => {
  if (!metadata) {
    return {}
  }

  const gtin = getSeoMetadataString(metadata, ["gtin"])
  const gtin8 = getSeoMetadataString(metadata, ["gtin8"])
  const gtin12 = getSeoMetadataString(metadata, ["gtin12", "upc"])
  const gtin13 = getSeoMetadataString(metadata, ["gtin13", "ean"])
  const gtin14 = getSeoMetadataString(metadata, ["gtin14"])
  const mpn = getSeoMetadataString(metadata, ["mpn", "manufacturer_part_number"])

  return {
    ...(gtin ? { gtin } : {}),
    ...(gtin8 ? { gtin8 } : {}),
    ...(gtin12 ? { gtin12 } : {}),
    ...(gtin13 ? { gtin13 } : {}),
    ...(gtin14 ? { gtin14 } : {}),
    ...(mpn ? { mpn } : {}),
  }
}

export const buildLocalizedPath = (
  countryCode: string,
  ...segments: Array<string | string[] | null | undefined>
) => {
  const normalizedSegments = segments
    .flat()
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)

  return `/${[countryCode.toLowerCase(), ...normalizedSegments].join("/")}`
}

export const normalizeSeoLocaleCode = (value?: string | null) =>
  value?.split(/[-_]/)[0]?.trim().toLowerCase() || null

export const getSeoLocaleCodes = (locales?: LocaleLike[] | null) => {
  const localeCodes = new Set<string>()

  locales?.forEach((locale) => {
    const code = normalizeSeoLocaleCode(locale.code)

    if (code) {
      localeCodes.add(code)
    }
  })

  ;["en", "ar", "he"].forEach((code) => localeCodes.add(code))

  return Array.from(localeCodes).sort()
}

export const buildLanguageAlternates = (
  path: string,
  locales?: LocaleLike[] | null,
  defaultLocale = "en"
) => {
  const canonicalUrl = buildCanonicalUrl(path)
  const alternateEntries = getSeoLocaleCodes(locales).map((locale) => [
    locale,
    `${canonicalUrl}?locale=${encodeURIComponent(locale)}`,
  ])

  return {
    ...Object.fromEntries(alternateEntries),
    "x-default": `${canonicalUrl}?locale=${encodeURIComponent(
      normalizeSeoLocaleCode(defaultLocale) ?? "en"
    )}`,
  }
}

export const getSitemapCountryCodes = (regions?: RegionLike[] | null) => {
  const countryCodes = new Set<string>()

  regions?.forEach((region) => {
    region.countries?.forEach((country) => {
      const iso2 = country.iso_2?.trim().toLowerCase()

      if (iso2) {
        countryCodes.add(iso2)
      }
    })
  })

  return Array.from(countryCodes).sort()
}

export const getCategoryPathSegments = (category: CategoryLike) => {
  const segments: string[] = []
  const seen = new Set<string>()
  let current: CategoryLike | null | undefined = category

  while (current?.handle && !seen.has(current.handle)) {
    seen.add(current.handle)
    segments.unshift(current.handle)
    current = current.parent_category
  }

  return segments
}

export const buildBreadcrumbStructuredData = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.item,
  })),
})

export const getCategoryBreadcrumbItems = (
  category: CategoryLike,
  countryCode: string
) => {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      name: "Home",
      item: buildCanonicalUrl(buildLocalizedPath(countryCode)),
    },
    {
      name: "Categories",
      item: buildCanonicalUrl(buildLocalizedPath(countryCode, "store")),
    },
  ]

  const lineage: CategoryLike[] = []
  const seen = new Set<string>()
  let current: CategoryLike | null | undefined = category

  while (current?.handle && !seen.has(current.handle)) {
    seen.add(current.handle)
    lineage.unshift(current)
    current = current.parent_category
  }

  const segments: string[] = []

  lineage.forEach((entry) => {
    if (!entry.handle || !entry.name) {
      return
    }

    segments.push(entry.handle)
    breadcrumbs.push({
      name: entry.name,
      item: buildCanonicalUrl(buildLocalizedPath(countryCode, "categories", segments)),
    })
  })

  return breadcrumbs
}

const hasProductAvailability = (variant?: HttpTypes.StoreProductVariant | null) => {
  if (!variant) {
    return false
  }

  if (variant.allow_backorder) {
    return true
  }

  if (variant.manage_inventory === false) {
    return true
  }

  return (variant.inventory_quantity ?? 0) > 0
}

const getProductStructuredDataPrice = (
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) => {
  const selectedVariant = selectedVariantId
    ? product.variants?.find((variant) => variant.id === selectedVariantId)
    : undefined
  const fallbackVariant = product.variants
    ?.filter((variant) => Boolean(variant.calculated_price?.calculated_amount))
    .sort(
      (left, right) =>
        (left.calculated_price?.calculated_amount ?? Number.MAX_SAFE_INTEGER) -
        (right.calculated_price?.calculated_amount ?? Number.MAX_SAFE_INTEGER)
    )[0]
  const pricedVariant = selectedVariant?.calculated_price ? selectedVariant : fallbackVariant

  if (!pricedVariant?.calculated_price?.currency_code) {
    return null
  }

  return {
    variant: pricedVariant,
    amount: pricedVariant.calculated_price.calculated_amount,
    currencyCode: pricedVariant.calculated_price.currency_code.toUpperCase(),
  }
}

export const buildWebsiteStructuredData = ({
  name,
  url,
  description,
}: {
  name: string
  url: string
  description?: string
}) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name,
  url,
  ...(description ? { description } : {}),
})

export const buildOrganizationStructuredData = ({
  name,
  url,
  description,
}: {
  name: string
  url: string
  description?: string
}) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name,
  url,
  ...(description ? { description } : {}),
})

export const buildCollectionPageStructuredData = ({
  name,
  description,
  url,
  image,
}: {
  name: string
  description?: string | null
  url: string
  image?: string | null
}) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name,
  url,
  ...(description ? { description } : {}),
  ...(image ? { image: buildAbsoluteSeoImageUrl(image) } : {}),
})

export const buildItemListStructuredData = ({
  name,
  url,
  items,
}: {
  name: string
  url: string
  items: ItemListEntry[]
}) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  url,
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    url: item.item,
  })),
})

export const buildProductStructuredData = ({
  product,
  url,
  image,
  selectedVariantId,
}: {
  product: HttpTypes.StoreProduct
  url: string
  image?: string | null
  selectedVariantId?: string
}) => {
  const price = getProductStructuredDataPrice(product, selectedVariantId)
  const metadata = product.metadata as Record<string, unknown> | null
  const brand = getSeoMetadataString(metadata, DEFAULT_PRODUCT_BRAND_KEYS)
  const reviews = buildProductReviewStructuredData(metadata)
  const aggregateRating = buildProductAggregateRatingStructuredData(metadata, reviews)
  const offers = price
    ? {
        "@type": "Offer",
        price: price.amount,
        priceCurrency: price.currencyCode,
        availability: hasProductAvailability(price.variant)
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url,
      }
    : null

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url,
    ...(product.description ? { description: product.description } : {}),
    ...(image ? { image: [buildAbsoluteSeoImageUrl(image)] } : {}),
    ...(product.handle ? { sku: product.handle } : {}),
    ...(product.categories?.[0]?.name ? { category: product.categories[0].name } : {}),
    ...(brand
      ? {
          brand: {
            "@type": "Brand",
            name: brand,
          },
        }
      : {}),
    ...buildProductIdentifierStructuredData(metadata),
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviews.length ? { review: reviews } : {}),
    ...(offers ? { offers } : {}),
  }
}

export const getSeoMetadataImage = (
  metadata?: Record<string, unknown> | null,
  keys: readonly string[] = DEFAULT_METADATA_IMAGE_KEYS
) => {
  if (!metadata) {
    return null
  }

  for (const key of keys) {
    const value = metadata[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return null
}
