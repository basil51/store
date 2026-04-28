import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type ProductLike = {
  id: string
  handle?: string | null
  title?: string | null
}

type CategoryLike = {
  id: string
  handle?: string | null
  name?: string | null
}

type LocaleLike = {
  code: string
}

type TranslationLike = {
  id: string
  translations?: Record<string, unknown> | null
}

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

const DEFAULT_BASELINE_LOCALE = "en"

const normalizeArgs = (args: string[]) => {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs

  return candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs
}

const parseLocales = (value: string | undefined) =>
  value
    ? value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : []

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isSyntheticVerificationHandle = (value: string | null | undefined) =>
  value?.startsWith("verify-") ?? false

const missingLabel = (values: Array<string | null | undefined>, fallbackId: string) => {
  for (const value of values) {
    if (value?.trim()) {
      return value.trim()
    }
  }

  return fallbackId
}

const buildLabelMap = async ({
  query,
  entity,
  fields,
  labelFields,
}: {
  query: QueryGraphLike
  entity: string
  fields: string[]
  labelFields: string[]
}) => {
  try {
    const { data } = await query.graph({
      entity,
      fields,
    })

    return new Map(
      (data ?? [])
        .map((item) => {
          const id = typeof item.id === "string" ? item.id : null
          if (!id) {
            return null
          }

          const label = missingLabel(
            labelFields.map((field) =>
              typeof item[field] === "string" ? (item[field] as string) : null
            ),
            id
          )

          return [id, label] as const
        })
        .filter((entry): entry is readonly [string, string] => Boolean(entry))
    )
  } catch {
    return new Map<string, string>()
  }
}

const pickCategoryReference = async (translationModule: any): Promise<string> => {
  try {
    const fields = await translationModule.getTranslatableFields()
    const keys = Array.isArray(fields)
      ? fields
      : typeof fields === "object" && fields
        ? Object.keys(fields)
        : []

    const preferred = keys.find((key) => key === "product_category")
    if (preferred) {
      return preferred
    }

    const inferred = keys.find(
      (key) => key.toLowerCase().includes("product") && key.toLowerCase().includes("categor")
    )

    if (inferred) {
      return inferred
    }
  } catch {
    return "product_category"
  }

  return "product_category"
}

const getPrimaryTranslation = async ({
  translationModule,
  reference,
  referenceId,
  localeCode,
}: {
  translationModule: any
  reference: string
  referenceId: string
  localeCode: string
}) => {
  const translations = (await translationModule.listTranslations({
    reference,
    reference_id: referenceId,
    locale_code: localeCode,
  })) as TranslationLike[]

  return translations[0]
}

export default async function auditTranslationCoverage({
  container,
  args,
}: ExecArgs) {
  const normalizedArgs = normalizeArgs(args)
  const baselineLocale = normalizedArgs[0] ?? DEFAULT_BASELINE_LOCALE
  const localesArg = normalizedArgs[1]

  const productModule = container.resolve(Modules.PRODUCT)
  const translationModule = container.resolve(Modules.TRANSLATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike

  const availableLocales = (await translationModule.listLocales({})) as LocaleLike[]
  const requestedLocales = parseLocales(localesArg)
  const targetLocales = (requestedLocales.length ? requestedLocales : availableLocales.map((locale) => locale.code))
    .filter((locale) => locale !== baselineLocale)

  if (!targetLocales.length) {
    throw new Error(
      `No non-baseline locales available. Seed locales first or pass locales explicitly after baseline '${baselineLocale}'.`
    )
  }

  const [products, categories, categoryReference, productLabels, categoryLabels] = await Promise.all([
    productModule.listProducts({}) as Promise<ProductLike[]>,
    productModule.listProductCategories({}) as Promise<CategoryLike[]>,
    pickCategoryReference(translationModule),
    buildLabelMap({
      query,
      entity: "product",
      fields: ["id", "handle", "title"],
      labelFields: ["handle", "title"],
    }),
    buildLabelMap({
      query,
      entity: "product_category",
      fields: ["id", "handle", "name"],
      labelFields: ["handle", "name"],
    }),
  ])

  const auditedCategories = categories.filter((category) => {
    const label = categoryLabels.get(category.id)

    return !isSyntheticVerificationHandle(category.handle) && !isSyntheticVerificationHandle(label)
  })

  const missingProductsByLocale: Record<string, string[]> = {}
  const missingCategoriesByLocale: Record<string, string[]> = {}

  for (const localeCode of targetLocales) {
    missingProductsByLocale[localeCode] = []
    missingCategoriesByLocale[localeCode] = []

    for (const product of products) {
      const translation = await getPrimaryTranslation({
        translationModule,
        reference: "product",
        referenceId: product.id,
        localeCode,
      })

      const title = translation?.translations?.title

      if (!isNonEmptyString(title)) {
        missingProductsByLocale[localeCode].push(
          productLabels.get(product.id) ?? missingLabel([product.handle, product.title], product.id)
        )
      }
    }

    for (const category of auditedCategories) {
      const translation = await getPrimaryTranslation({
        translationModule,
        reference: categoryReference,
        referenceId: category.id,
        localeCode,
      })

      const name = translation?.translations?.name

      if (!isNonEmptyString(name)) {
        missingCategoriesByLocale[localeCode].push(
          categoryLabels.get(category.id) ?? missingLabel([category.handle, category.name], category.id)
        )
      }
    }
  }

  console.log(`Baseline locale: ${baselineLocale}`)
  console.log(`Audited locales: ${targetLocales.join(", ")}`)
  console.log(`Products audited: ${products.length}`)
  console.log(`Categories audited: ${auditedCategories.length}`)

  let hasMissingTranslations = false

  for (const localeCode of targetLocales) {
    const missingProducts = missingProductsByLocale[localeCode]
    const missingCategories = missingCategoriesByLocale[localeCode]

    console.log(`\nLocale '${localeCode}':`)
    console.log(`- Products missing translated title: ${missingProducts.length}`)
    console.log(`- Categories missing translated name: ${missingCategories.length}`)

    if (missingProducts.length) {
      hasMissingTranslations = true
      console.log(`  Product handles: ${missingProducts.join(", ")}`)
    }

    if (missingCategories.length) {
      hasMissingTranslations = true
      console.log(`  Category handles: ${missingCategories.join(", ")}`)
    }
  }

  if (hasMissingTranslations) {
    throw new Error("Translation coverage audit failed: missing catalog translations detected.")
  }

  console.log("Translation coverage audit passed: all audited products and categories have translated primary fields.")
}