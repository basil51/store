import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import {
  canUseDefaultPublishableKeyFallback,
  DEFAULT_TENANT_SLUG,
  resolveTenantPublishableKey,
  StoreTenantContext,
  TENANT_CACHE_COOKIE_BASE,
  TENANT_COOKIE_NAME,
  TENANT_DEFAULT_LOCALE_COOKIE_NAME,
  TENANT_LOCALE_COOKIE_BASE,
  TENANT_PUBLISHABLE_KEY_COOKIE_NAME,
  TENANT_STOREFRONT_HOST_COOKIE_NAME,
  getTenantScopedCookieName,
  normalizeTenantHost,
} from "@lib/util/tenant"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en"

const regionMapCache = new Map<
  string,
  { regionMap: Map<string, HttpTypes.StoreRegion>; regionMapUpdated: number }
>()

const tenantCache = new Map<
  string,
  { tenant: StoreTenantContext | null; tenantUpdated: number }
>()

async function getTenantContext(request: NextRequest) {
  const host = normalizeTenantHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  )

  if (!BACKEND_URL || !host) {
    return null
  }

  const cached = tenantCache.get(host)

  if (cached && cached.tenantUpdated > Date.now() - 3600 * 1000) {
    return cached.tenant
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/tenant?host=${encodeURIComponent(host)}`,
      {
        next: {
          revalidate: 3600,
          tags: [`tenant-${host}`],
        },
        cache: "force-cache",
      }
    )

    if (!response.ok) {
      tenantCache.set(host, { tenant: null, tenantUpdated: Date.now() })
      return null
    }

    const data = (await response.json()) as { tenant?: StoreTenantContext | null }
    const tenant = data.tenant ?? null

    tenantCache.set(host, { tenant, tenantUpdated: Date.now() })
    return tenant
  } catch {
    return null
  }
}

async function getRegionMap(cacheId: string, publishableApiKey: string) {
  const cacheKey = publishableApiKey || "default"
  let cacheEntry = regionMapCache.get(cacheKey)

  if (!BACKEND_URL) {
    throw new Error(
      "Proxy.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL."
    )
  }

  if (
    !cacheEntry?.regionMap.keys().next().value ||
    (cacheEntry?.regionMapUpdated ?? 0) < Date.now() - 3600 * 1000
  ) {
    const { regions } = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: {
        "x-publishable-api-key": publishableApiKey,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}-${cacheKey}`],
      },
      cache: "force-cache",
    }).then(async (response) => {
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.message)
      }

      return json
    })

    if (!regions?.length) {
      throw new Error(
        "No regions found. Please set up regions in your Medusa Admin."
      )
    }

    cacheEntry = {
      regionMap: new Map<string, HttpTypes.StoreRegion>(),
      regionMapUpdated: Date.now(),
    }

    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        cacheEntry?.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.set(cacheKey, cacheEntry)
  }

  return cacheEntry?.regionMap ?? new Map<string, HttpTypes.StoreRegion>()
}

function applyTenantCookies(
  response: NextResponse,
  tenantContext: StoreTenantContext | null,
  existingLocale: string | undefined
) {
  const maxAge = 60 * 60 * 24 * 30
  const defaultLocale = tenantContext?.default_locale || DEFAULT_LOCALE

  if (tenantContext?.tenant_slug) {
    response.cookies.set(TENANT_COOKIE_NAME, tenantContext.tenant_slug, { maxAge })
  } else {
    response.cookies.set(TENANT_COOKIE_NAME, DEFAULT_TENANT_SLUG, { maxAge })
  }

  const publishableKey = resolveTenantPublishableKey({
    tenantSlug: tenantContext?.tenant_slug,
    tenantPublishableKey: tenantContext?.publishable_api_key_token,
    defaultPublishableKey: PUBLISHABLE_API_KEY,
  })

  if (publishableKey) {
    response.cookies.set(
      TENANT_PUBLISHABLE_KEY_COOKIE_NAME,
      publishableKey,
      { maxAge }
    )
  } else {
    response.cookies.delete(TENANT_PUBLISHABLE_KEY_COOKIE_NAME)
  }

  if (tenantContext?.storefront_host) {
    response.cookies.set(TENANT_STOREFRONT_HOST_COOKIE_NAME, tenantContext.storefront_host, {
      maxAge,
    })
  }

  response.cookies.set(TENANT_DEFAULT_LOCALE_COOKIE_NAME, defaultLocale, {
    maxAge,
  })

  if (!existingLocale) {
    response.cookies.set(
      getTenantScopedCookieName(
        TENANT_LOCALE_COOKIE_BASE,
        tenantContext?.tenant_slug ?? "default"
      ),
      defaultLocale,
      {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: false,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      }
    )
  }

  return response
}

async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = request.headers
      .get("x-vercel-ip-country")
      ?.toLowerCase()

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Proxy.ts: Error getting the country code. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL."
      )
    }
  }
}

export async function proxy(request: NextRequest) {
  const tenantContext = await getTenantContext(request)
  const effectivePublishableKey = resolveTenantPublishableKey({
    tenantSlug: tenantContext?.tenant_slug,
    tenantPublishableKey: tenantContext?.publishable_api_key_token,
    defaultPublishableKey: PUBLISHABLE_API_KEY,
  })

  if (!effectivePublishableKey) {
    if (!canUseDefaultPublishableKeyFallback(tenantContext?.tenant_slug)) {
      throw new Error(
        `Proxy.ts: Tenant '${tenantContext?.tenant_slug}' is missing a publishable key.`
      )
    }

    throw new Error(
      "Proxy.ts: Missing publishable key. Set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY or provision a tenant with a publishable key."
    )
  }

  let redirectUrl = request.nextUrl.href

  let response = NextResponse.redirect(redirectUrl, 307)

  const targetTenantSlug =
    tenantContext?.tenant_slug || request.cookies.get(TENANT_COOKIE_NAME)?.value || DEFAULT_TENANT_SLUG
  const cacheCookieName = getTenantScopedCookieName(TENANT_CACHE_COOKIE_BASE, targetTenantSlug)
  const localeCookieName = getTenantScopedCookieName(TENANT_LOCALE_COOKIE_BASE, targetTenantSlug)

  const cacheIdCookie =
    request.cookies.get(cacheCookieName) ?? request.cookies.get(TENANT_CACHE_COOKIE_BASE)
  const localeCookie =
    request.cookies.get(localeCookieName)?.value ?? request.cookies.get(TENANT_LOCALE_COOKIE_BASE)?.value

  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId, effectivePublishableKey)

  const countryCode = regionMap && (await getCountryCode(request, regionMap))
  const pathname = request.nextUrl.pathname

  const urlHasCountryCode =
    countryCode && request.nextUrl.pathname.split("/")[1].includes(countryCode)

  if (urlHasCountryCode && cacheIdCookie) {
    return applyTenantCookies(NextResponse.next(), tenantContext, localeCookie)
  }

  if (urlHasCountryCode && !cacheIdCookie) {
    response.cookies.set(cacheCookieName, cacheId, {
      maxAge: 60 * 60 * 24,
    })

    return applyTenantCookies(response, tenantContext, localeCookie)
  }

  if (request.nextUrl.pathname.includes(".")) {
    return applyTenantCookies(NextResponse.next(), tenantContext, localeCookie)
  }

  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  if (!urlHasCountryCode && countryCode && pathname === "/") {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/${countryCode}`

    const rewritten = NextResponse.rewrite(rewriteUrl)

    if (!cacheIdCookie) {
      rewritten.cookies.set(cacheCookieName, cacheId, {
        maxAge: 60 * 60 * 24,
      })
    }

    return applyTenantCookies(rewritten, tenantContext, localeCookie)
  }

  if (!urlHasCountryCode && countryCode) {
    redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
  } else if (!urlHasCountryCode && !countryCode) {
    return new NextResponse(
      "No valid regions configured. Please set up regions with countries in your Medusa Admin.",
      { status: 500 }
    )
  }

  return applyTenantCookies(response, tenantContext, localeCookie)
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}