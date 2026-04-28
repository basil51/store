import { ExecArgs } from "@medusajs/framework/types"

type StoreProduct = {
  id?: string
  handle?: string
  title?: string | null
  subtitle?: string | null
  description?: string | null
}

const DEFAULT_API_BASE = "http://127.0.0.1:9244"
const DEFAULT_LOCALES = ["en", "ar"]

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

export default async function verifyProductTranslations({ args }: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 3 ? args : argvArgs
  const normalizedArgs =
    candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs

  const apiBase = normalizedArgs[0] ?? DEFAULT_API_BASE
  const publishableApiKey =
    normalizedArgs[1] ?? process.env.STORE_PUBLISHABLE_KEY
  const productHandle = normalizedArgs[2]
  const localesArg = normalizedArgs[3]

  if (!publishableApiKey) {
    throw new Error(
      "Missing publishable API key. Pass arg #2 or set STORE_PUBLISHABLE_KEY."
    )
  }

  if (!productHandle) {
    throw new Error(
      "Missing product handle. Usage: medusa exec ./src/scripts/verify-product-translations.ts <apiBase> <publishableKey> <productHandle> [localesCsv]"
    )
  }

  const locales = localesArg
    ? localesArg
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : DEFAULT_LOCALES

  if (locales.length < 2) {
    throw new Error("Provide at least two locales to compare.")
  }

  const url = new URL(`${apiBase}/store/products`)
  url.searchParams.set("handle", productHandle)
  url.searchParams.set("fields", "id,handle,title,subtitle,description")

  const localeToProduct: Record<string, StoreProduct> = {}

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
        `No product returned for handle '${productHandle}' and locale '${locale}'.`
      )
    }

    localeToProduct[locale] = product
  }

  const [baselineLocale, ...otherLocales] = locales
  const baseline = localeToProduct[baselineLocale]

  console.log(`Verified product handle: ${productHandle}`)
  console.log(
    `${baselineLocale}: ${productPreview(localeToProduct[baselineLocale])}`
  )

  let allComparedDifferent = true

  for (const locale of otherLocales) {
    const current = localeToProduct[locale]
    const isDifferent =
      (baseline.title ?? "") !== (current.title ?? "") ||
      (baseline.subtitle ?? "") !== (current.subtitle ?? "") ||
      (baseline.description ?? "") !== (current.description ?? "")

    console.log(`${locale}: ${productPreview(current)}`)

    if (!isDifferent) {
      allComparedDifferent = false
      console.warn(
        `WARNING: '${locale}' content is identical to '${baselineLocale}'. Translation may be missing.`
      )
    }
  }

  if (!allComparedDifferent) {
    throw new Error(
      "Translation verification completed, but one or more locales matched baseline text exactly."
    )
  }

  console.log("Translation verification passed: localized product fields differ across locales.")
}