import { getCacheOptions } from "./cookies"

export const CART_REVALIDATE_SECONDS = 30

export const getCartCacheOptions = async () => ({
  ...(await getCacheOptions("carts")),
  revalidate: CART_REVALIDATE_SECONDS,
})