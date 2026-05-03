import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type CollectionLike = {
  id: string
  handle?: string | null
  title?: string | null
}

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

const titleFromHandle = (handle: string) =>
  handle
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const pickCollectionReference = async (translationModule: any): Promise<string> => {
  try {
    const fields = await translationModule.getTranslatableFields()
    const keys = Array.isArray(fields)
      ? fields
      : typeof fields === "object" && fields
        ? Object.keys(fields)
        : []

    const preferred = keys.find((key) => key === "product_collection")
    if (preferred) {
      return preferred
    }

    const inferred = keys.find(
      (key) => key.toLowerCase().includes("product") && key.toLowerCase().includes("collection")
    )

    if (inferred) {
      return inferred
    }
  } catch {
    return "product_collection"
  }

  return "product_collection"
}

export default async function upsertCollectionTranslation({
  container,
  args,
}: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  const normalizedArgs =
    candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs

  const collectionHandle = normalizedArgs[0]
  const localeCode = normalizedArgs[1] ?? "ar"
  const customTitle = normalizedArgs[2]

  if (!collectionHandle) {
    throw new Error(
      "Missing collection handle. Usage: medusa exec ./src/scripts/upsert-collection-translation.ts <collectionHandle> [localeCode] [title]"
    )
  }

  const translationModule = container.resolve(Modules.TRANSLATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike

  const { data } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "title"],
  })

  const collections = (data ?? []) as CollectionLike[]
  const collection = collections.find((entry) => entry.handle === collectionHandle)

  if (!collection) {
    throw new Error(`No collection found for handle '${collectionHandle}'.`)
  }

  const existingLocales = await translationModule.listLocales({ code: localeCode })
  if (!existingLocales.length) {
    await translationModule.createLocales({
      code: localeCode,
      name: localeCode,
    })
    console.log(`Created locale '${localeCode}'.`)
  }

  const reference = await pickCollectionReference(translationModule)

  const title =
    customTitle ??
    (localeCode.toLowerCase().startsWith("ar")
      ? `نسخة عربية: ${
          collection.title ??
          (collection.handle ? titleFromHandle(collection.handle) : titleFromHandle(collectionHandle))
        }`
      : `${localeCode.toUpperCase()}: ${
          collection.title ??
          (collection.handle ? titleFromHandle(collection.handle) : titleFromHandle(collectionHandle))
        }`)

  const existingTranslations = await translationModule.listTranslations({
    reference,
    reference_id: collection.id,
    locale_code: localeCode,
  })

  if (existingTranslations.length) {
    const current = existingTranslations[0]
    const merged = {
      ...(current.translations ?? {}),
      title,
    }

    await translationModule.updateTranslations({
      id: current.id,
      translations: merged,
    })

    console.log(
      `Updated translation for collection '${collectionHandle}' (${collection.id}) in locale '${localeCode}' using reference '${reference}'.`
    )
  } else {
    await translationModule.createTranslations({
      reference,
      reference_id: collection.id,
      locale_code: localeCode,
      translations: {
        title,
      },
    })

    console.log(
      `Created translation for collection '${collectionHandle}' (${collection.id}) in locale '${localeCode}' using reference '${reference}'.`
    )
  }

  console.log(`title=${JSON.stringify(title)}`)
}