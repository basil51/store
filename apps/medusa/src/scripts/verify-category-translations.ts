import { ExecArgs } from "@medusajs/framework/types"

type StoreCategory = {
  id?: string
  handle?: string
  name?: string | null
  description?: string | null
}

const DEFAULT_API_BASE = "http://127.0.0.1:9244"
const DEFAULT_LOCALES = ["en", "ar"]

const categoryPreview = (category: StoreCategory | undefined) => {
  if (!category) {
    return "<missing category>"
  }

  return [
    `name=${JSON.stringify(category.name ?? null)}`,
    `description=${JSON.stringify(category.description ?? null)}`,
  ].join(" | ")
}

export default async function verifyCategoryTranslations({ args }: ExecArgs) {
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
  const categoryHandle = normalizedArgs[2]
  const localesArg = normalizedArgs[3]

  if (!publishableApiKey) {
    throw new Error(
      "Missing publishable API key. Pass arg #2 or set STORE_PUBLISHABLE_KEY."
    )
  }

  if (!categoryHandle) {
    throw new Error(
      "Missing category handle. Usage: medusa exec ./src/scripts/verify-category-translations.ts <apiBase> <publishableKey> <categoryHandle> [localesCsv]"
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

  const url = new URL(`${apiBase}/store/product-categories`)
  url.searchParams.set("handle", categoryHandle)
  url.searchParams.set("fields", "id,handle,name,description")

  const localeToCategory: Record<string, StoreCategory> = {}

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

    const data = (await response.json()) as {
      product_categories?: StoreCategory[]
    }

    const category = data.product_categories?.[0]
    if (!category) {
      throw new Error(
        `No category returned for handle '${categoryHandle}' and locale '${locale}'.`
      )
    }

    localeToCategory[locale] = category
  }

  const [baselineLocale, ...otherLocales] = locales
  const baseline = localeToCategory[baselineLocale]

  console.log(`Verified category handle: ${categoryHandle}`)
  console.log(
    `${baselineLocale}: ${categoryPreview(localeToCategory[baselineLocale])}`
  )

  let allComparedDifferent = true

  for (const locale of otherLocales) {
    const current = localeToCategory[locale]
    const isDifferent =
      (baseline.name ?? "") !== (current.name ?? "") ||
      (baseline.description ?? "") !== (current.description ?? "")

    console.log(`${locale}: ${categoryPreview(current)}`)

    if (!isDifferent) {
      allComparedDifferent = false
      console.warn(
        `WARNING: '${locale}' category content is identical to '${baselineLocale}'. Translation may be missing.`
      )
    }
  }

  if (!allComparedDifferent) {
    throw new Error(
      "Category translation verification completed, but one or more locales matched baseline text exactly."
    )
  }

  console.log("Category translation verification passed: localized category fields differ across locales.")
}