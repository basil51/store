import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  createStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

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

type SalesChannelLike = {
  id: string
  name?: string | null
}

type ApiKeyLike = {
  id: string
  token?: string | null
  title?: string | null
}

type CurrencyInput = {
  currency_code: string
  is_default?: boolean
}

const DEFAULT_CURRENCIES = "usd*"
const DEFAULT_DEFAULT_LOCALE = "en"
const DEFAULT_STOCK_MODE = "track_visible"

const normalizeArgs = (args: string[]) => {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  return candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const parseCurrencies = (value: string | undefined): CurrencyInput[] => {
  const source = value?.trim() || DEFAULT_CURRENCIES
  const parsed = source
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const isDefault = part.endsWith("*")
      const currencyCode = (isDefault ? part.slice(0, -1) : part).trim().toLowerCase()

      if (!currencyCode) {
        throw new Error(`Invalid currency entry '${part}'.`)
      }

      return {
        currency_code: currencyCode,
        is_default: isDefault || index === 0,
      }
    })

  if (!parsed.some((entry) => entry.is_default)) {
    parsed[0].is_default = true
  }

  return parsed
}

const findDuplicateDefaultCurrencies = (currencies: CurrencyInput[]) => {
  const defaults = currencies.filter((entry) => entry.is_default)
  return defaults.length > 1 ? defaults.map((entry) => entry.currency_code) : []
}

const readString = (value: unknown) => (typeof value === "string" ? value : null)

const getStoreByTenantSlug = async (query: QueryGraphLike, tenantSlug: string) => {
  const { data } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_sales_channel_id", "default_location_id", "metadata"],
  })

  const stores = (data ?? []) as StoreLike[]

  return stores.find((store) => {
    const metadataSlug = readString(store.metadata?.tenant_slug)
    return metadataSlug === tenantSlug
  })
}

const getSalesChannelByName = async (salesChannelModule: any, name: string) => {
  const channels = (await salesChannelModule.listSalesChannels({
    name,
  })) as SalesChannelLike[]

  return channels[0]
}

const getPublishableApiKeyByTitle = async (query: QueryGraphLike, title: string) => {
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type"],
    filters: {
      type: "publishable",
    },
  })

  const keys = (data ?? []) as Array<ApiKeyLike & { type?: string }>
  return keys.find((key) => key.title === title)
}

export default async function provisionStoreTenant({
  container,
  args,
}: ExecArgs) {
  const normalizedArgs = normalizeArgs(args)

  const storeName = normalizedArgs[0]
  const tenantSlug = normalizedArgs[1] ?? (storeName ? slugify(storeName) : undefined)
  const storefrontHost = normalizedArgs[2] ?? ""
  const localesCsv = normalizedArgs[3] ?? DEFAULT_DEFAULT_LOCALE
  const currenciesCsv = normalizedArgs[4] ?? DEFAULT_CURRENCIES
  const stockMode = normalizedArgs[5] ?? DEFAULT_STOCK_MODE

  if (!storeName) {
    throw new Error(
      "Missing store name. Usage: medusa exec ./src/scripts/provision-store-tenant.ts <storeName> [tenantSlug] [storefrontHost] [localesCsv] [currenciesCsv] [stockMode]"
    )
  }

  if (!tenantSlug) {
    throw new Error("Could not derive tenant slug from the provided store name.")
  }

  const supportedLocales = localesCsv
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (!supportedLocales.length) {
    throw new Error("Provide at least one locale.")
  }

  const supportedCurrencies = parseCurrencies(currenciesCsv)
  const duplicateDefaultCurrencies = findDuplicateDefaultCurrencies(supportedCurrencies)

  if (duplicateDefaultCurrencies.length) {
    throw new Error(
      `Only one currency can be marked as default. Found: ${duplicateDefaultCurrencies.join(", ")}`
    )
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)

  const existingStore = await getStoreByTenantSlug(query, tenantSlug)
  const salesChannelName = `${storeName} Sales Channel`
  const publishableKeyTitle = `${storeName} Storefront`

  const store = existingStore
    ? existingStore
    : (
        await createStoresWorkflow(container).run({
          input: {
            stores: [
              {
                name: storeName,
                supported_currencies: supportedCurrencies,
              },
            ],
          },
        })
      ).result[0]

  const salesChannel =
    (await getSalesChannelByName(salesChannelModule, salesChannelName)) ??
    (
      await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [
            {
              name: salesChannelName,
              description: `Tenant sales channel for ${storeName}`,
            },
          ],
        },
      })
    ).result[0]

  const publishableApiKey =
    (await getPublishableApiKeyByTitle(query, publishableKeyTitle)) ??
    (
      await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            {
              title: publishableKeyTitle,
              type: "publishable",
              created_by: "",
            },
          ],
        },
      })
    ).result[0]

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [salesChannel.id],
    },
  })

  const existingMetadata = (store.metadata ?? {}) as Record<string, unknown>
  const defaultLocale = supportedLocales[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: salesChannel.id,
        supported_currencies: supportedCurrencies,
        metadata: {
          ...existingMetadata,
          tenant_slug: tenantSlug,
          storefront_host: storefrontHost || existingMetadata.storefront_host || null,
          supported_locales: supportedLocales,
          default_locale: defaultLocale,
          default_stock_mode: stockMode,
          publishable_api_key_id: publishableApiKey.id,
          sales_channel_id: salesChannel.id,
        },
      },
    },
  })

  console.log(`Store ID: ${store.id}`)
  console.log(`Store name: ${storeName}`)
  console.log(`Tenant slug: ${tenantSlug}`)
  console.log(`Sales channel ID: ${salesChannel.id}`)
  console.log(`Sales channel name: ${salesChannel.name ?? salesChannelName}`)
  console.log(`Publishable API key ID: ${publishableApiKey.id}`)
  console.log(`Publishable API key token: ${publishableApiKey.token ?? "<hidden by Medusa>"}`)
  console.log(`Default locale: ${defaultLocale}`)
  console.log(
    `Supported currencies: ${supportedCurrencies
      .map((entry) => `${entry.currency_code}${entry.is_default ? "*" : ""}`)
      .join(",")}`
  )
}