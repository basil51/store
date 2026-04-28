import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

type StoreLike = {
  id: string
  name?: string | null
  default_sales_channel_id?: string | null
  default_location_id?: string | null
  metadata?: Record<string, unknown> | null
}

const readString = (value: unknown) => (typeof value === "string" ? value : null)

const normalizeHost = (value: string | null | undefined) =>
  value?.trim().toLowerCase().split(":")[0] ?? null

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const tenantSlug = readString(req.query?.tenant)
  const requestedHost = normalizeHost(readString(req.query?.host))

  const { data } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_sales_channel_id", "default_location_id", "metadata"],
  })

  const stores = (data ?? []) as StoreLike[]
  const store = stores.find((item) => {
    const metadata = (item.metadata ?? {}) as Record<string, unknown>
    const candidateTenantSlug = readString(metadata.tenant_slug)
    const candidateHost = normalizeHost(readString(metadata.storefront_host))

    if (tenantSlug && candidateTenantSlug === tenantSlug) {
      return true
    }

    if (requestedHost && candidateHost === requestedHost) {
      return true
    }

    return false
  })

  if (!store) {
    return res.status(404).json({ tenant: null })
  }

  const metadata = (store.metadata ?? {}) as Record<string, unknown>
  const publishableApiKeyId = readString(metadata.publishable_api_key_id)

  let publishableApiKey: Record<string, unknown> | undefined

  if (publishableApiKeyId) {
    const { data: apiKeys } = await query.graph({
      entity: "api_key",
      fields: ["id", "title", "token", "type", "revoked_at"],
      filters: {
        id: publishableApiKeyId,
        type: "publishable",
      },
    })

    publishableApiKey = apiKeys?.[0]
  }

  return res.status(200).json({
    tenant: {
      id: store.id,
      name: store.name ?? null,
      tenant_slug: readString(metadata.tenant_slug),
      storefront_host: normalizeHost(readString(metadata.storefront_host)),
      default_locale: readString(metadata.default_locale),
      supported_locales: Array.isArray(metadata.supported_locales)
        ? metadata.supported_locales
        : [],
      default_stock_mode: readString(metadata.default_stock_mode),
      default_sales_channel_id: store.default_sales_channel_id ?? null,
      default_location_id: store.default_location_id ?? null,
      publishable_api_key_id: readString(metadata.publishable_api_key_id),
      publishable_api_key_title: readString(publishableApiKey?.title),
      publishable_api_key_token: readString(publishableApiKey?.token),
      publishable_api_key_revoked_at: publishableApiKey?.revoked_at ?? null,
    },
  })
}
