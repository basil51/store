type ProductTranslationFields = {
  title: string
  subtitle: string
  description: string
}

type ProductLike = {
  id: string
  title?: string | null
  subtitle?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}

type TranslationLike = {
  id: string
  locale_code?: string | null
  translations?: Record<string, unknown> | null
}

type AutoTranslationConfig = {
  enabled: boolean
  defaultSourceLocale: string
  targetLocales: string[]
  ai: {
    apiKey: string | null
    baseUrl: string
    model: string | null
  }
}

const DEFAULT_SOURCE_LOCALE = "en"
const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1"

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const normalizeLocaleCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const getLocaleFamily = (value: unknown) => normalizeLocaleCode(value).split("-")[0] || ""

const hasArabicScript = (value: string) => /[\u0600-\u06FF]/.test(value)

const hasHebrewScript = (value: string) => /[\u0590-\u05FF]/.test(value)

const localeLabel = (locale: string) => {
  switch (locale) {
    case "ar":
      return "Arabic"
    case "he":
      return "Hebrew"
    case "en":
      return "English"
    default:
      return locale
  }
}

export const isAutoProductTranslationEnabled = (
  rawValue = process.env.AUTO_PRODUCT_TRANSLATIONS
) => normalizeText(rawValue).toLowerCase() !== "false"

export const resolveAvailableLocaleCode = ({
  requestedLocale,
  availableLocales,
}: {
  requestedLocale: string
  availableLocales: string[]
}) => {
  const normalizedRequested = normalizeLocaleCode(requestedLocale)

  if (!normalizedRequested) {
    return ""
  }

  const exact = availableLocales.find(
    (locale) => normalizeLocaleCode(locale) === normalizedRequested
  )

  if (exact) {
    return exact
  }

  const family = getLocaleFamily(normalizedRequested)

  return (
    availableLocales.find((locale) => getLocaleFamily(locale) === family) ||
    normalizedRequested
  )
}

export const buildFallbackProductTranslation = (
  product: ProductLike
): ProductTranslationFields => ({
  title: normalizeText(product.title),
  subtitle: normalizeText(product.subtitle),
  description: normalizeText(product.description),
})

export const translationHasContent = (
  translation?: TranslationLike | null
): boolean => {
  const translations = translation?.translations ?? {}

  return Boolean(
    normalizeText(translations.title) ||
      normalizeText(translations.subtitle) ||
      normalizeText(translations.description)
  )
}

export const detectProductSourceLocale = ({
  product,
  availableLocales,
  fallbackLocale = DEFAULT_SOURCE_LOCALE,
}: {
  product: ProductLike
  availableLocales: string[]
  fallbackLocale?: string
}) => {
  const resolvedLocales = availableLocales.map((locale) => locale.trim()).filter(Boolean)
  const normalizedLocales = resolvedLocales.map(normalizeLocaleCode)
  const metadataLocale = normalizeLocaleCode(product.metadata?.translation_source_locale)

  if (metadataLocale && normalizedLocales.includes(metadataLocale)) {
    return resolvedLocales[normalizedLocales.indexOf(metadataLocale)]
  }

  const combined = [product.title, product.subtitle, product.description]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")

  if (combined && normalizedLocales.some((locale) => getLocaleFamily(locale) === "ar") && hasArabicScript(combined)) {
    return resolveAvailableLocaleCode({ requestedLocale: "ar", availableLocales: resolvedLocales })
  }

  if (combined && normalizedLocales.some((locale) => getLocaleFamily(locale) === "he") && hasHebrewScript(combined)) {
    return resolveAvailableLocaleCode({ requestedLocale: "he", availableLocales: resolvedLocales })
  }

  if (
    normalizedLocales.some(
      (locale) => getLocaleFamily(locale) === getLocaleFamily(fallbackLocale)
    )
  ) {
    return resolveAvailableLocaleCode({
      requestedLocale: fallbackLocale,
      availableLocales: resolvedLocales,
    })
  }

  return resolvedLocales[0] ?? DEFAULT_SOURCE_LOCALE
}

export const resolveAutoTranslationConfig = (
  localeCodesFromModule: string[]
): AutoTranslationConfig => {
  const availableLocales = [...new Set(localeCodesFromModule.map((locale) => locale.trim()).filter(Boolean))]
  const configuredLocales = normalizeText(
    process.env.AUTO_PRODUCT_TRANSLATION_TARGET_LOCALES
  )
    .split(",")
    .map(normalizeLocaleCode)
    .filter(Boolean)

  return {
    enabled: isAutoProductTranslationEnabled(),
    defaultSourceLocale: resolveAvailableLocaleCode({
      requestedLocale:
        normalizeLocaleCode(process.env.AUTO_PRODUCT_TRANSLATION_SOURCE_LOCALE) ||
        DEFAULT_SOURCE_LOCALE,
      availableLocales,
    }),
    targetLocales: [
      ...new Set(
        (configuredLocales.length ? configuredLocales : availableLocales).map((locale) =>
          resolveAvailableLocaleCode({
            requestedLocale: locale,
            availableLocales,
          })
        )
      ),
    ].filter(Boolean),
    ai: {
      apiKey:
        normalizeText(process.env.AI_TRANSLATION_API_KEY) ||
        normalizeText(process.env.OPENAI_API_KEY) ||
        null,
      baseUrl:
        normalizeText(process.env.AI_TRANSLATION_BASE_URL) ||
        DEFAULT_AI_BASE_URL,
      model: normalizeText(process.env.AI_TRANSLATION_MODEL) || null,
    },
  }
}

export const getMissingProductTranslationLocales = ({
  sourceLocale,
  targetLocales,
  existingTranslations,
}: {
  sourceLocale: string
  targetLocales: string[]
  existingTranslations: TranslationLike[]
}) => {
  const byLocale = new Map(
    existingTranslations
      .map((entry) => [normalizeLocaleCode(entry.locale_code), entry] as const)
      .filter(([locale]) => Boolean(locale))
  )

  const sourceLocaleFamily = getLocaleFamily(sourceLocale)

  return targetLocales.filter((locale) => {
    const normalizedLocale = normalizeLocaleCode(locale)
    const localeFamily = getLocaleFamily(locale)

    if (
      !normalizedLocale ||
      normalizedLocale === normalizeLocaleCode(sourceLocale) ||
      localeFamily === sourceLocaleFamily
    ) {
      return false
    }

    const existing =
      byLocale.get(normalizedLocale) ||
      Array.from(byLocale.entries()).find(
        ([existingLocale]) => getLocaleFamily(existingLocale) === localeFamily
      )?.[1]

    return !translationHasContent(existing)
  })
}

export const mergeProductTranslationFields = ({
  existing,
  generated,
}: {
  existing?: TranslationLike | null
  generated: ProductTranslationFields
}): ProductTranslationFields => {
  const current = existing?.translations ?? {}

  return {
    title: normalizeText(current.title) || generated.title,
    subtitle: normalizeText(current.subtitle) || generated.subtitle,
    description: normalizeText(current.description) || generated.description,
  }
}

const parseAiJsonContent = (value: string): Partial<ProductTranslationFields> | null => {
  try {
    const parsed = JSON.parse(value) as Partial<ProductTranslationFields>
    return typeof parsed === "object" && parsed ? parsed : null
  } catch {
    const jsonStart = value.indexOf("{")
    const jsonEnd = value.lastIndexOf("}")

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        return JSON.parse(value.slice(jsonStart, jsonEnd + 1)) as Partial<ProductTranslationFields>
      } catch {
        return null
      }
    }

    return null
  }
}

export const translateProductFieldsWithAi = async ({
  product,
  sourceLocale,
  targetLocale,
  config,
}: {
  product: ProductLike
  sourceLocale: string
  targetLocale: string
  config: AutoTranslationConfig
}): Promise<ProductTranslationFields> => {
  const fallback = buildFallbackProductTranslation(product)

  if (!config.ai.apiKey || !config.ai.model || sourceLocale === targetLocale) {
    return fallback
  }

  const endpoint = `${config.ai.baseUrl.replace(/\/$/, "")}/chat/completions`

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.ai.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.ai.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You translate ecommerce product content. Return only valid JSON with keys title, subtitle, and description. Preserve model numbers, brand names, and technical units.",
          },
          {
            role: "user",
            content: JSON.stringify({
              source_locale: sourceLocale,
              target_locale: targetLocale,
              source_locale_label: localeLabel(sourceLocale),
              target_locale_label: localeLabel(targetLocale),
              title: fallback.title,
              subtitle: fallback.subtitle,
              description: fallback.description,
            }),
          },
        ],
      }),
    })

    if (!response.ok) {
      return fallback
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const content = json.choices?.[0]?.message?.content

    if (!content) {
      return fallback
    }

    const parsed = parseAiJsonContent(content)

    if (!parsed) {
      return fallback
    }

    return {
      title: normalizeText(parsed.title) || fallback.title,
      subtitle: normalizeText(parsed.subtitle) || fallback.subtitle,
      description: normalizeText(parsed.description) || fallback.description,
    }
  } catch {
    return fallback
  }
}