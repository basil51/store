export const REGION_MAP_REVALIDATE_SECONDS = 3600

export const buildRegionCacheTag = (
  publishableApiKey: string | null | undefined
) => `regions-${publishableApiKey?.trim() || "default"}`

export const getRegionFetchCacheOptions = (
  publishableApiKey: string | null | undefined
) => ({
  revalidate: REGION_MAP_REVALIDATE_SECONDS,
  tags: [buildRegionCacheTag(publishableApiKey)],
})