import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type CategoryLike = {
  id: string
  handle?: string | null
  name?: string | null
  description?: string | null
}

const titleFromHandle = (handle: string) =>
  handle
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const pickCategoryReference = async (translationModule: any): Promise<string> => {
  try {
    const fields = await translationModule.getTranslatableFields()
    const keys = Array.isArray(fields)
      ? fields
      : typeof fields === "object" && fields
        ? Object.keys(fields)
        : []

    const preferred = keys.find((k) => k === "product_category")
    if (preferred) {
      return preferred
    }

    const inferred = keys.find(
      (k) => k.toLowerCase().includes("product") && k.toLowerCase().includes("categor")
    )

    if (inferred) {
      return inferred
    }
  } catch {
    // Fallback below.
  }

  return "product_category"
}

export default async function upsertCategoryTranslation({
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

  const categoryHandle = normalizedArgs[0]
  const localeCode = normalizedArgs[1] ?? "ar"
  const customName = normalizedArgs[2]
  const customDescription = normalizedArgs[3]

  if (!categoryHandle) {
    throw new Error(
      "Missing category handle. Usage: medusa exec ./src/scripts/upsert-category-translation.ts <categoryHandle> [localeCode] [name] [description]"
    )
  }

  const productModule = container.resolve(Modules.PRODUCT)
  const translationModule = container.resolve(Modules.TRANSLATION)

  const categories = (await productModule.listProductCategories({
    handle: categoryHandle,
  })) as CategoryLike[]

  const category = categories[0]

  if (!category) {
    throw new Error(`No category found for handle '${categoryHandle}'.`)
  }

  const existingLocales = await translationModule.listLocales({ code: localeCode })
  if (!existingLocales.length) {
    await translationModule.createLocales({
      code: localeCode,
      name: localeCode,
    })
    console.log(`Created locale '${localeCode}'.`)
  }

  const reference = await pickCategoryReference(translationModule)

  const name =
    customName ??
    (localeCode.toLowerCase().startsWith("ar")
      ? `نسخة عربية: ${
          category.name ??
          (category.handle
            ? titleFromHandle(category.handle)
            : titleFromHandle(categoryHandle))
        }`
      : `${localeCode.toUpperCase()}: ${
          category.name ??
          (category.handle
            ? titleFromHandle(category.handle)
            : titleFromHandle(categoryHandle))
        }`)

  const description =
    customDescription ??
    (localeCode.toLowerCase().startsWith("ar")
      ? `وصف عربي: ${category.description ?? ""}`
      : `${localeCode.toUpperCase()} description: ${category.description ?? ""}`)

  const existingTranslations = await translationModule.listTranslations({
    reference,
    reference_id: category.id,
    locale_code: localeCode,
  })

  if (existingTranslations.length) {
    const current = existingTranslations[0]
    const merged = {
      ...(current.translations ?? {}),
      name,
      description,
    }

    await translationModule.updateTranslations({
      id: current.id,
      translations: merged,
    })

    console.log(
      `Updated translation for category '${categoryHandle}' (${category.id}) in locale '${localeCode}' using reference '${reference}'.`
    )
  } else {
    await translationModule.createTranslations({
      reference,
      reference_id: category.id,
      locale_code: localeCode,
      translations: {
        name,
        description,
      },
    })

    console.log(
      `Created translation for category '${categoryHandle}' (${category.id}) in locale '${localeCode}' using reference '${reference}'.`
    )
  }

  console.log(`name=${JSON.stringify(name)}`)
  console.log(`description=${JSON.stringify(description)}`)
}