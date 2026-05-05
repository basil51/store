import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"

type StoreProduct = {
  id?: string
  handle?: string
  title?: string | null
  subtitle?: string | null
  description?: string | null
}

type StoreLike = {
  default_sales_channel_id?: string | null
}

type SalesChannelLike = {
  id: string
  name?: string | null
}

type ShippingProfileLike = {
  id: string
  type?: string | null
}

type TranslationLike = {
  locale_code?: string | null
  translations?: Record<string, unknown> | null
}

const DEFAULT_API_BASE = "http://127.0.0.1:9244"
const DEFAULT_LOCALES = ["en", "ar", "he"]
const DEFAULT_TRANSLATION_WAIT_MS = 20_000
const DEFAULT_TRANSLATION_POLL_MS = 500

const getArg = (args: string[], index: number) => args[index]?.trim() || undefined

const productPreview = (product: StoreProduct | undefined) => {
  if (!product) {
    return "<missing product>"
  }

  return [
    `title=${JSON.stringify(product.title ?? null)}`,
    `subtitle=${JSON.stringify(product.subtitle ?? null)}`,
    `description=${JSON.stringify(product.description ?? null)}`,
  ].join(" | ")
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForTranslationLocales = async ({
  translationModule,
  productId,
  expectedLocales,
  timeoutMs = DEFAULT_TRANSLATION_WAIT_MS,
  pollMs = DEFAULT_TRANSLATION_POLL_MS,
}: {
  translationModule: any
  productId: string
  expectedLocales: string[]
  timeoutMs?: number
  pollMs?: number
}) => {
  const normalizedExpected = [...new Set(expectedLocales.map((locale) => locale.trim().toLowerCase()).filter(Boolean))]
  const deadline = Date.now() + timeoutMs
  let translations: TranslationLike[] = []

  while (Date.now() <= deadline) {
    translations = (await translationModule.listTranslations({
      reference: "product",
      reference_id: productId,
    })) as TranslationLike[]

    const availableLocales = new Set(
      translations
        .map((entry) => entry.locale_code?.trim().toLowerCase())
        .filter(Boolean)
    )

    if (normalizedExpected.every((locale) => availableLocales.has(locale))) {
      return translations
    }

    await delay(pollMs)
  }

  return translations
}

export default async function verifyProductAutoTranslation({
  container,
  args,
}: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)
  const candidateArgs = args.length ? args : argvArgs
  const normalizedArgs =
    candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs

  const apiBase = getArg(normalizedArgs, 0) ?? DEFAULT_API_BASE
  const publishableApiKey =
    getArg(normalizedArgs, 1) ??
    process.env.STORE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const locales = (getArg(normalizedArgs, 2) ?? DEFAULT_LOCALES.join(","))
    .split(",")
    .map((locale) => locale.trim())
    .filter(Boolean)

  if (!publishableApiKey) {
    throw new Error(
      "Missing publishable API key. Pass arg #2 or set STORE_PUBLISHABLE_KEY / NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY."
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeModule = container.resolve(Modules.STORE) as any
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as any
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
  const translationModule = container.resolve(Modules.TRANSLATION) as any

  const [store] = (await storeModule.listStores()) as StoreLike[]
  const salesChannels = (await salesChannelModule.listSalesChannels({})) as SalesChannelLike[]
  const shippingProfiles = (await fulfillmentModule.listShippingProfiles({
    type: "default",
  })) as ShippingProfileLike[]

  const defaultSalesChannelId =
    store?.default_sales_channel_id ?? salesChannels[0]?.id ?? null
  const defaultShippingProfileId = shippingProfiles[0]?.id ?? null

  if (!defaultSalesChannelId) {
    throw new Error("Unable to resolve a default sales channel for verification.")
  }

  if (!defaultShippingProfileId) {
    throw new Error("Unable to resolve a default shipping profile for verification.")
  }

  const suffix = Date.now().toString().slice(-8)
  const handle = `verify-auto-translation-${suffix}`
  const title = `هاتف تحقق تلقائي ${suffix}`
  const subtitle = `نسخة عربية ${suffix}`
  const description = `وصف تحقق تلقائي للمنتج ${suffix}`

  logger.info(`Creating verification product '${handle}'...`)

  const { result: createdProducts } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title,
          subtitle,
          description,
          handle,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: defaultShippingProfileId,
          sales_channels: [{ id: defaultSalesChannelId }],
          options: [
            {
              title: "Edition",
              values: ["Standard"],
            },
          ],
          variants: [
            {
              title: "Default",
              sku: `VERIFY-AUTO-${suffix}`,
              options: {
                Edition: "Standard",
              },
              manage_inventory: false,
              prices: [
                { currency_code: "eur", amount: 100 },
                { currency_code: "usd", amount: 110 },
                { currency_code: "ils", amount: 390 },
              ],
            },
          ],
        },
      ],
    },
  })

  const createdProduct = createdProducts[0]

  if (!createdProduct?.id) {
    throw new Error("Verification product creation did not return an ID.")
  }

  const url = new URL(`${apiBase}/store/products`)
  url.searchParams.set("handle", handle)
  url.searchParams.set("fields", "id,handle,title,subtitle,description")

  const localeToProduct: Record<string, StoreProduct> = {}

  try {
    const expectedGeneratedLocales = locales.filter((locale) => locale.trim().toLowerCase() !== "ar")
    const translations = await waitForTranslationLocales({
      translationModule,
      productId: createdProduct.id,
      expectedLocales: expectedGeneratedLocales,
    })

    for (const locale of locales) {
      const response = await fetch(url.toString(), {
        headers: {
          "x-publishable-api-key": publishableApiKey,
          "x-medusa-locale": locale,
        },
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(
          `Store API request failed for locale '${locale}': ${response.status} ${response.statusText} - ${body}`
        )
      }

      const data = (await response.json()) as { products?: StoreProduct[] }
      const product = data.products?.[0]

      if (!product) {
        throw new Error(
          `No storefront product returned for handle '${handle}' and locale '${locale}'.`
        )
      }

      localeToProduct[locale] = product
    }

    console.log(`Verification product handle: ${handle}`)
    console.log(`Created source text: ${productPreview({ title, subtitle, description })}`)

    for (const locale of locales) {
      console.log(`${locale}: ${productPreview(localeToProduct[locale])}`)
    }

    console.log(
      `Stored translation locales: ${translations
        .map((entry) => entry.locale_code)
        .filter(Boolean)
        .join(", ")}`
    )
  } finally {
    logger.info(`Deleting verification product '${handle}'...`)

    await deleteProductsWorkflow(container).run({
      input: {
        ids: [createdProduct.id],
      },
    })
  }
}