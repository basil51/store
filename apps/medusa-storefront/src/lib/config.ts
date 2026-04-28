import "server-only"

import { getLocaleHeader } from "@lib/util/get-locale-header"
import {
  canUseDefaultPublishableKeyFallback,
  resolveTenantPublishableKey,
  TENANT_COOKIE_NAME,
  TENANT_PUBLISHABLE_KEY_COOKIE_NAME,
} from "@lib/util/tenant"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"
import { cookies as nextCookies } from "next/headers"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let tenantPublishableKey: string | null = null
  let tenantSlug: string | null = null
  let localeHeader: Record<string, string | null> | undefined

  try {
    const cookies = await nextCookies()
    tenantSlug = cookies.get(TENANT_COOKIE_NAME)?.value ?? null
    tenantPublishableKey = cookies.get(TENANT_PUBLISHABLE_KEY_COOKIE_NAME)?.value ?? null
  } catch {}

  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const publishableKey = resolveTenantPublishableKey({
    tenantSlug,
    tenantPublishableKey,
    defaultPublishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  })

  if (
    !headers["x-publishable-api-key"] &&
    !publishableKey &&
    !canUseDefaultPublishableKeyFallback(tenantSlug)
  ) {
    throw new Error(
      `Config.ts: Tenant '${tenantSlug}' is missing a publishable key.`
    )
  }

  headers["x-publishable-api-key"] ??= publishableKey ?? undefined

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}
