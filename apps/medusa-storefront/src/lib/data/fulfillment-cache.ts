import { getCacheOptions } from "./cookies"

export const FULFILLMENT_REVALIDATE_SECONDS = 60

export const getFulfillmentCacheOptions = async () => ({
  ...(await getCacheOptions("fulfillment")),
  revalidate: FULFILLMENT_REVALIDATE_SECONDS,
})