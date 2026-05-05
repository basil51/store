import { getCacheOptions } from "./cookies"

export const ORDERS_REVALIDATE_SECONDS = 60

export const getOrdersCacheOptions = async () => ({
  ...(await getCacheOptions("orders")),
  revalidate: ORDERS_REVALIDATE_SECONDS,
})