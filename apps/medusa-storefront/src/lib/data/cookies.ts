import "server-only"
import { cookies as nextCookies } from "next/headers"
import {
  DEFAULT_TENANT_SLUG,
  TENANT_AUTH_COOKIE_BASE,
  TENANT_CACHE_COOKIE_BASE,
  TENANT_CART_COOKIE_BASE,
  TENANT_COOKIE_NAME,
  TENANT_DEFAULT_LOCALE_COOKIE_NAME,
  TENANT_LOCALE_COOKIE_BASE,
  TENANT_PUBLISHABLE_KEY_COOKIE_NAME,
  getTenantScopedCookieName,
  normalizeTenantSlug,
  resolveTenantPublishableKey,
} from "@lib/util/tenant"

const getTenantCookieValue = (
  cookies: Awaited<ReturnType<typeof nextCookies>>,
  baseName: string,
  tenantSlug: string | null,
  legacyName?: string
) => {
  const scopedName = getTenantScopedCookieName(baseName, tenantSlug)
  return cookies.get(scopedName)?.value ?? (legacyName ? cookies.get(legacyName)?.value : null)
}

const setTenantCookieValue = (
  cookies: Awaited<ReturnType<typeof nextCookies>>,
  baseName: string,
  tenantSlug: string | null,
  value: string,
  options: Parameters<typeof cookies.set>[2],
  legacyName?: string
) => {
  cookies.set(getTenantScopedCookieName(baseName, tenantSlug), value, options)

  if (legacyName) {
    cookies.set(legacyName, "", { maxAge: -1 })
  }
}

const getCurrentTenantSlug = (cookies: Awaited<ReturnType<typeof nextCookies>>) =>
  normalizeTenantSlug(cookies.get(TENANT_COOKIE_NAME)?.value ?? DEFAULT_TENANT_SLUG)

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = getTenantCookieValue(
      cookies,
      TENANT_AUTH_COOKIE_BASE,
      getCurrentTenantSlug(cookies),
      TENANT_AUTH_COOKIE_BASE
    )

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const tenantSlug = getCurrentTenantSlug(cookies)
    const cacheId = getTenantCookieValue(
      cookies,
      TENANT_CACHE_COOKIE_BASE,
      tenantSlug,
      TENANT_CACHE_COOKIE_BASE
    )

    if (!cacheId) {
      return ""
    }

    return `${tenantSlug}-${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  setTenantCookieValue(
    cookies,
    TENANT_AUTH_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    token,
    {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
    TENANT_AUTH_COOKIE_BASE
  )
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  setTenantCookieValue(
    cookies,
    TENANT_AUTH_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    "",
    {
      maxAge: -1,
    },
    TENANT_AUTH_COOKIE_BASE
  )
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return getTenantCookieValue(
    cookies,
    TENANT_CART_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    TENANT_CART_COOKIE_BASE
  )
}

export const getTenantSlug = async () => {
  const cookies = await nextCookies()
  return cookies.get(TENANT_COOKIE_NAME)?.value ?? null
}

export const getTenantDefaultLocale = async () => {
  const cookies = await nextCookies()
  return cookies.get(TENANT_DEFAULT_LOCALE_COOKIE_NAME)?.value ?? null
}

export const getTenantPublishableKey = async () => {
  const cookies = await nextCookies()
  const tenantSlug = getCurrentTenantSlug(cookies)
  const tenantPublishableKey =
    cookies.get(TENANT_PUBLISHABLE_KEY_COOKIE_NAME)?.value ?? null

  return resolveTenantPublishableKey({
    tenantSlug,
    tenantPublishableKey,
    defaultPublishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  })
}

export const getTenantLocale = async () => {
  const cookies = await nextCookies()
  return getTenantCookieValue(
    cookies,
    TENANT_LOCALE_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    TENANT_LOCALE_COOKIE_BASE
  )
}

export const setTenantLocale = async (locale: string) => {
  const cookies = await nextCookies()
  setTenantCookieValue(
    cookies,
    TENANT_LOCALE_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    locale,
    {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
    TENANT_LOCALE_COOKIE_BASE
  )
}

export const clearTenantLocale = async () => {
  const cookies = await nextCookies()
  setTenantCookieValue(
    cookies,
    TENANT_LOCALE_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    "",
    {
      maxAge: -1,
    },
    TENANT_LOCALE_COOKIE_BASE
  )
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  setTenantCookieValue(
    cookies,
    TENANT_CART_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    cartId,
    {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
    TENANT_CART_COOKIE_BASE
  )
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  setTenantCookieValue(
    cookies,
    TENANT_CART_COOKIE_BASE,
    getCurrentTenantSlug(cookies),
    "",
    {
      maxAge: -1,
    },
    TENANT_CART_COOKIE_BASE
  )
}
