import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import {
  detectProductSourceLocale,
  getMissingProductTranslationLocales,
  mergeProductTranslationFields,
  resolveAutoTranslationConfig,
  translateProductFieldsWithAi,
} from "../shared/product-auto-translation"

type ProductLike = {
  id: string
  title?: string | null
  subtitle?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}

type LocaleLike = {
  code?: string | null
}

type TranslationLike = {
  id: string
  locale_code?: string | null
  translations?: Record<string, unknown> | null
}

const normalizeLocaleCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const getLocaleFamily = (value: unknown) => normalizeLocaleCode(value).split("-")[0] || ""

const ensureLocale = async ({
  translationModule,
  existingLocales,
  localeCode,
}: {
  translationModule: any
  existingLocales: LocaleLike[]
  localeCode: string
}) => {
  const requestedCode = normalizeLocaleCode(localeCode)
  const requestedFamily = getLocaleFamily(localeCode)

  if (
    !requestedCode ||
    existingLocales.some((locale) => normalizeLocaleCode(locale.code) === requestedCode) ||
    existingLocales.some((locale) => getLocaleFamily(locale.code) === requestedFamily)
  ) {
    return
  }

  const created = (await translationModule.createLocales({
    code: localeCode,
    name: localeCode,
  })) as LocaleLike[] | LocaleLike

  if (Array.isArray(created)) {
    existingLocales.push(...created)
  } else if (created) {
    existingLocales.push(created)
  }
}

export default async function productAutoTranslationSubscriber({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = event.data.id

  if (!productId) {
    return
  }

  const productModule = container.resolve(Modules.PRODUCT) as any
  const translationModule = container.resolve(Modules.TRANSLATION) as any

  const products = (await productModule.listProducts({ id: productId })) as ProductLike[]
  const product = products[0]

  if (!product) {
    return
  }

  const locales = (await translationModule.listLocales({})) as LocaleLike[]
  const localeCodes = locales
    .map((locale) => locale.code?.trim().toLowerCase() ?? "")
    .filter(Boolean)

  const config = resolveAutoTranslationConfig(localeCodes)

  if (!config.enabled || !config.targetLocales.length) {
    return
  }

  const sourceLocale = detectProductSourceLocale({
    product,
    availableLocales: config.targetLocales,
    fallbackLocale: config.defaultSourceLocale,
  })

  const existingTranslations = (await translationModule.listTranslations({
    reference: "product",
    reference_id: product.id,
  })) as TranslationLike[]

  const missingLocales = getMissingProductTranslationLocales({
    sourceLocale,
    targetLocales: config.targetLocales,
    existingTranslations,
  })

  for (const localeCode of missingLocales) {
    await ensureLocale({
      translationModule,
      existingLocales: locales,
      localeCode,
    })

    const existingTranslation = existingTranslations.find(
      (entry) => entry.locale_code?.trim().toLowerCase() === localeCode
    )
    const generated = await translateProductFieldsWithAi({
      product,
      sourceLocale,
      targetLocale: localeCode,
      config,
    })
    const merged = mergeProductTranslationFields({
      existing: existingTranslation,
      generated,
    })

    if (existingTranslation) {
      await translationModule.updateTranslations({
        id: existingTranslation.id,
        translations: {
          ...(existingTranslation.translations ?? {}),
          title: merged.title,
          subtitle: merged.subtitle,
          description: merged.description,
        },
      })
    } else {
      await translationModule.createTranslations({
        reference: "product",
        reference_id: product.id,
        locale_code: localeCode,
        translations: {
          title: merged.title,
          subtitle: merged.subtitle,
          description: merged.description,
        },
      })
    }
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
  context: {
    subscriberId: "product-auto-translation",
  },
}