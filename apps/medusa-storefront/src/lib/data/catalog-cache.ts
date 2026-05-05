export const CATALOG_REVALIDATE_SECONDS = 300
const CATALOG_CACHE_TAGS = {
  products: "catalog-products",
  categories: "catalog-categories",
  collections: "catalog-collections",
  variants: "catalog-variants",
} as const

export type CatalogCacheKey = keyof typeof CATALOG_CACHE_TAGS

export const getCatalogCacheTag = (tag: CatalogCacheKey) => CATALOG_CACHE_TAGS[tag]

export const normalizeCatalogCacheTags = (tags?: string[]) => {
  if (!tags?.length) {
    return Object.values(CATALOG_CACHE_TAGS)
  }

  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag): tag is CatalogCacheKey => tag in CATALOG_CACHE_TAGS)

  return [...new Set(normalized.map((tag) => getCatalogCacheTag(tag)))]
}

export const getCatalogCacheOptions = async (tag: CatalogCacheKey) => ({
  tags: [getCatalogCacheTag(tag)],
  revalidate: CATALOG_REVALIDATE_SECONDS,
})