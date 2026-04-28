"use server"

import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"
import { cookies as nextCookies } from "next/headers"
import {
  clearTenantLocale,
  getAuthHeaders,
  getCacheTag,
  getCartId,
  getTenantDefaultLocale,
  getTenantLocale,
  setTenantLocale,
} from "./cookies"

/**
 * Gets the current locale from cookies
 */
export const getLocale = async (): Promise<string | null> => {
  try {
    return (await getTenantLocale()) ?? (await getTenantDefaultLocale())
  } catch {
    return null
  }
}

/**
 * Sets the locale cookie
 */
export const setLocaleCookie = async (locale: string) => {
  await setTenantLocale(locale)
}

/**
 * Updates the locale preference via SDK and stores in cookie.
 * Also updates the cart with the new locale if one exists.
 */
export const updateLocale = async (localeCode: string): Promise<string> => {
  const cookies = await nextCookies()

  if (!localeCode) {
    await clearTenantLocale()
  } else {
    await setLocaleCookie(localeCode)
  }

  const effectiveLocale = localeCode || "en"

  const cartId = await getCartId()
  if (cartId) {
    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.cart.update(
      cartId,
      { locale: effectiveLocale },
      {},
      headers
    )

    const cartCacheTag = await getCacheTag("carts")
    if (cartCacheTag) {
      revalidateTag(cartCacheTag)
    }
  }

  const productsCacheTag = await getCacheTag("products")
  if (productsCacheTag) {
    revalidateTag(productsCacheTag)
  }

  const categoriesCacheTag = await getCacheTag("categories")
  if (categoriesCacheTag) {
    revalidateTag(categoriesCacheTag)
  }

  const collectionsCacheTag = await getCacheTag("collections")
  if (collectionsCacheTag) {
    revalidateTag(collectionsCacheTag)
  }

  return effectiveLocale
}
