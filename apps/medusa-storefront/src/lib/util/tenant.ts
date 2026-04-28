export const TENANT_COOKIE_NAME = "_medusa_tenant"
export const TENANT_PUBLISHABLE_KEY_COOKIE_NAME = "_medusa_publishable_key"
export const TENANT_DEFAULT_LOCALE_COOKIE_NAME = "_medusa_default_locale"
export const TENANT_STOREFRONT_HOST_COOKIE_NAME = "_medusa_storefront_host"
export const TENANT_CART_COOKIE_BASE = "_medusa_cart_id"
export const TENANT_AUTH_COOKIE_BASE = "_medusa_jwt"
export const TENANT_CACHE_COOKIE_BASE = "_medusa_cache_id"
export const TENANT_LOCALE_COOKIE_BASE = "_medusa_locale"
export const DEFAULT_TENANT_SLUG = "default"

export type StoreTenantContext = {
  id: string
  name: string | null
  tenant_slug: string | null
  storefront_host: string | null
  default_locale: string | null
  supported_locales: string[]
  default_stock_mode: string | null
  default_sales_channel_id: string | null
  default_location_id: string | null
  publishable_api_key_id: string | null
  publishable_api_key_title: string | null
  publishable_api_key_token: string | null
  publishable_api_key_revoked_at: string | null
}

export const normalizeTenantHost = (value: string | null | undefined) =>
  value?.trim().toLowerCase().split(":")[0] ?? null

export const normalizeTenantSlug = (value: string | null | undefined) =>
  value?.trim().toLowerCase() || DEFAULT_TENANT_SLUG

export const canUseDefaultPublishableKeyFallback = (
  tenantSlug: string | null | undefined
) => normalizeTenantSlug(tenantSlug) === DEFAULT_TENANT_SLUG

export const resolveTenantPublishableKey = ({
  tenantSlug,
  tenantPublishableKey,
  defaultPublishableKey,
}: {
  tenantSlug: string | null | undefined
  tenantPublishableKey: string | null | undefined
  defaultPublishableKey: string | null | undefined
}) => {
  const normalizedTenantKey = tenantPublishableKey?.trim() || null

  if (normalizedTenantKey) {
    return normalizedTenantKey
  }

  if (!canUseDefaultPublishableKeyFallback(tenantSlug)) {
    return null
  }

  return defaultPublishableKey?.trim() || null
}

export const getTenantScopedCookieName = (
  baseName: string,
  tenantSlug: string | null | undefined
) => {
  const normalizedSlug = normalizeTenantSlug(tenantSlug)
  return `${baseName}_${normalizedSlug}`
}