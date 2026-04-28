import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  deleteApiKeysWorkflow,
  deleteSalesChannelsWorkflow,
  deleteStoresWorkflow,
  revokeApiKeysWorkflow,
} from "@medusajs/medusa/core-flows"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

type StoreRecord = {
  id: string
  name?: string | null
  default_sales_channel_id?: string | null
  metadata?: Record<string, unknown> | null
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

const getStoreByTenantSlug = async (query: QueryGraphLike, tenantSlug: string) => {
  const { data } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_sales_channel_id", "metadata"],
  })

  const stores = (data ?? []) as StoreRecord[]

  return stores.find((store) => {
    const metadataSlug = readString(store.metadata?.tenant_slug)
    return metadataSlug === tenantSlug
  })
}

export default async function deleteStoreTenant({
  container,
  args,
}: ExecArgs) {
  const normalizedArgs = normalizeArgs(args)
  const tenantSlug = normalizedArgs[0]

  if (!tenantSlug) {
    throw new Error(
      "Missing tenant slug. Usage: medusa exec ./src/scripts/delete-store-tenant.ts <tenantSlug>"
    )
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const store = await getStoreByTenantSlug(query, tenantSlug)

  if (!store) {
    throw new Error(`No tenant-owned store found for slug '${tenantSlug}'.`)
  }

  const metadata = (store.metadata ?? {}) as Record<string, unknown>
  const apiKeyId = readString(metadata.publishable_api_key_id)
  const salesChannelId = readString(metadata.sales_channel_id) ?? store.default_sales_channel_id ?? null

  await deleteStoresWorkflow(container).run({
    input: {
      ids: [store.id],
    },
  })

  if (salesChannelId) {
    await deleteSalesChannelsWorkflow(container).run({
      input: {
        ids: [salesChannelId],
      },
    })
  }

  if (apiKeyId) {
    await revokeApiKeysWorkflow(container).run({
      input: {
        selector: { id: apiKeyId },
        revoke: {
          revoked_by: "tenant-cleanup",
        },
      },
    })

    await deleteApiKeysWorkflow(container).run({
      input: {
        ids: [apiKeyId],
      },
    })
  }

  console.log(`Deleted tenant slug: ${tenantSlug}`)
  console.log(`Deleted store ID: ${store.id}`)
  console.log(`Deleted sales channel ID: ${salesChannelId ?? "<none>"}`)
  console.log(`Deleted publishable API key ID: ${apiKeyId ?? "<none>"}`)
}