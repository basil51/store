import { ExecArgs } from "@medusajs/framework/types"

type StoreCollection = {
  id?: string
  handle?: string
  title?: string | null
}

const DEFAULT_API_BASE = "http://127.0.0.1:9244"
const DEFAULT_LOCALES = ["en", "ar"]

const collectionPreview = (collection: StoreCollection | undefined) => {
  if (!collection) {
    return "<missing collection>"
  }

  return [`title=${JSON.stringify(collection.title ?? null)}`].join(" | ")
}

export default async function verifyCollectionTranslations({ args }: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 3 ? args : argvArgs
  const normalizedArgs =
    candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs

  const apiBase = normalizedArgs[0] ?? DEFAULT_API_BASE
  const publishableApiKey = normalizedArgs[1] ?? process.env.STORE_PUBLISHABLE_KEY
  const collectionHandle = normalizedArgs[2]
  const localesArg = normalizedArgs[3]

  if (!publishableApiKey) {
    throw new Error(
      "Missing publishable API key. Pass arg #2 or set STORE_PUBLISHABLE_KEY."
    )
  }

  if (!collectionHandle) {
    throw new Error(
      "Missing collection handle. Usage: medusa exec ./src/scripts/verify-collection-translations.ts <apiBase> <publishableKey> <collectionHandle> [localesCsv]"
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

  const url = new URL(`${apiBase}/store/collections`)
  url.searchParams.set("handle", collectionHandle)
  url.searchParams.set("fields", "id,handle,title")

  const localeToCollection: Record<string, StoreCollection> = {}

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

    const data = (await response.json()) as { collections?: StoreCollection[] }
    const collection = data.collections?.[0]

    if (!collection) {
      throw new Error(
        `No collection returned for handle '${collectionHandle}' and locale '${locale}'.`
      )
    }

    localeToCollection[locale] = collection
  }

  const [baselineLocale, ...otherLocales] = locales
  const baseline = localeToCollection[baselineLocale]

  console.log(`Verified collection handle: ${collectionHandle}`)
  console.log(`${baselineLocale}: ${collectionPreview(localeToCollection[baselineLocale])}`)

  let allComparedDifferent = true

  for (const locale of otherLocales) {
    const current = localeToCollection[locale]
    const isDifferent = (baseline.title ?? "") !== (current.title ?? "")

    console.log(`${locale}: ${collectionPreview(current)}`)

    if (!isDifferent) {
      allComparedDifferent = false
      console.warn(
        `WARNING: '${locale}' collection content is identical to '${baselineLocale}'. Translation may be missing.`
      )
    }
  }

  if (!allComparedDifferent) {
    throw new Error(
      "Collection translation verification completed, but one or more locales matched baseline text exactly."
    )
  }

  console.log("Collection translation verification passed: localized collection titles differ across locales.")
}