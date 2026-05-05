import { getCacheOptions } from "./cookies"

export const REGIONS_REVALIDATE_SECONDS = 3600
export const REGIONS_MAP_MAX_AGE_MS = REGIONS_REVALIDATE_SECONDS * 1000

export const getRegionsCacheOptions = async (tag: string) => ({
  ...(await getCacheOptions(tag)),
  revalidate: REGIONS_REVALIDATE_SECONDS,
})

export const isRegionMapEntryFresh = (
  updatedAt: number | null | undefined,
  now = Date.now()
) => typeof updatedAt === "number" && updatedAt > now - REGIONS_MAP_MAX_AGE_MS