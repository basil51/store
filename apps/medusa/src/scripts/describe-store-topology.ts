import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

const normalizeArgs = (args: string[]) => {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  return candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs
}

const readString = (value: unknown) => (typeof value === "string" ? value : null)

export default async function describeStoreTopology({
  container,
  args,
}: ExecArgs) {
  const [tenantSlugFilter] = normalizeArgs(args)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike

  const [{ data: stores }, { data: apiKeys }] = await Promise.all([
    query.graph({
      entity: "store",
      fields: ["id", "name", "default_sales_channel_id", "default_location_id", "metadata"],
    }),
    query.graph({
      entity: "api_key",
      fields: ["id", "title", "type", "token"],
      filters: { type: "publishable" },
    }),
  ])

  const publishableKeysById = new Map(
    (apiKeys ?? []).map((item) => [String(item.id), item])
  )

  const selectedStores = (stores ?? []).filter((item) => {
    const metadata = (item.metadata ?? {}) as Record<string, unknown>
    const tenantSlug = readString(metadata.tenant_slug)

    return tenantSlugFilter ? tenantSlug === tenantSlugFilter : true
  })

  if (!selectedStores.length) {
    throw new Error(
      tenantSlugFilter
        ? `No store found for tenant slug '${tenantSlugFilter}'.`
        : "No stores found."
    )
  }

  for (const store of selectedStores) {
    const metadata = (store.metadata ?? {}) as Record<string, unknown>
    const apiKeyId = readString(metadata.publishable_api_key_id)
    const apiKey = apiKeyId ? publishableKeysById.get(apiKeyId) : null

    console.log(JSON.stringify({
      id: store.id,
      name: store.name,
      tenant_slug: metadata.tenant_slug ?? null,
      storefront_host: metadata.storefront_host ?? null,
      default_locale: metadata.default_locale ?? null,
      supported_locales: metadata.supported_locales ?? [],
      default_stock_mode: metadata.default_stock_mode ?? null,
      default_sales_channel_id: store.default_sales_channel_id ?? null,
      default_location_id: store.default_location_id ?? null,
      publishable_api_key_id: apiKeyId,
      publishable_api_key_title: apiKey?.title ?? null,
      publishable_api_key_token: apiKey?.token ?? null,
    }, null, 2))
  }
}