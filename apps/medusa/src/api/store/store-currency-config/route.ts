import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type VariantCombinationEntry = {
  title: string
  summary?: string
  badge?: string
  is_default?: true
  option_values: Record<string, string>
}

type VariantCombinationDefaultsByType = Record<string, VariantCombinationEntry[]>
type WhatsAppTemplateLocale = "en" | "ar" | "he"
type LocalizedWhatsAppTemplates = Record<WhatsAppTemplateLocale, string>

const DEFAULT_CURRENCIES = [
  { code: "ILS", label: "₪ ILS", symbol: "₪", rate: 1,    enabled: true },
  { code: "USD", label: "$ USD", symbol: "$", rate: 0.27,  enabled: true },
  { code: "EUR", label: "€ EUR", symbol: "€", rate: 0.25,  enabled: true },
  { code: "GBP", label: "£ GBP", symbol: "£", rate: 0.21,  enabled: false },
  { code: "JOD", label: "JD JOD", symbol: "JD", rate: 0.19, enabled: false },
]

const DEFAULT_WHATSAPP_TEMPLATES: LocalizedWhatsAppTemplates = {
  en: "Hello! I'd like to order:\n{{items}}\nTotal: {{total}}",
  ar: "مرحباً! أود طلب:\n{{items}}\nالإجمالي: {{total}}",
  he: "שלום! אני רוצה להזמין:\n{{items}}\nסה״כ: {{total}}",
}

const cleanWhatsAppTemplate = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

const normalizeWhatsAppTemplates = (
  value: unknown,
  legacyTemplate?: unknown
): LocalizedWhatsAppTemplates => {
  const templates =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<WhatsAppTemplateLocale, unknown>>)
      : {}

  const englishTemplate =
    cleanWhatsAppTemplate(templates.en) ??
    cleanWhatsAppTemplate(legacyTemplate) ??
    DEFAULT_WHATSAPP_TEMPLATES.en

  return {
    en: englishTemplate,
    ar: cleanWhatsAppTemplate(templates.ar) ?? DEFAULT_WHATSAPP_TEMPLATES.ar,
    he: cleanWhatsAppTemplate(templates.he) ?? DEFAULT_WHATSAPP_TEMPLATES.he,
  }
}

const normalizeVariantCombinationDefaultsByType = (
  value: unknown
): VariantCombinationDefaultsByType => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    VariantCombinationDefaultsByType
  >((acc, [type, combinations]) => {
    const normalizedType = type.trim()

    if (!normalizedType || !Array.isArray(combinations)) {
      return acc
    }

    const normalizedCombinations = combinations
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
      .map((entry) => {
        const title = typeof entry.title === "string" ? entry.title.trim() : ""
        const summary =
          typeof entry.summary === "string" && entry.summary.trim()
            ? entry.summary.trim()
            : undefined
        const badge =
          typeof entry.badge === "string" && entry.badge.trim()
            ? entry.badge.trim()
            : undefined
        const optionValues = Object.entries(
          (entry.option_values as Record<string, unknown> | undefined) ?? {}
        ).reduce<Record<string, string>>((optionAcc, [key, currentValue]) => {
          if (typeof currentValue !== "string") {
            return optionAcc
          }

          const normalizedKey = key.trim()
          const normalizedValue = currentValue.trim()

          if (normalizedKey && normalizedValue) {
            optionAcc[normalizedKey] = normalizedValue
          }

          return optionAcc
        }, {})

        if (!title || !Object.keys(optionValues).length) {
          return null
        }

        return {
          title,
          ...(summary ? { summary } : {}),
          ...(badge ? { badge } : {}),
          ...(entry.is_default === true ? { is_default: true } : {}),
          option_values: optionValues,
        } satisfies VariantCombinationEntry
      })
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)

    let didAssignDefault = false

    const combinationsWithSingleDefault = normalizedCombinations.map((entry) => {
      if (!entry.is_default) {
        return entry
      }

      if (!didAssignDefault) {
        didAssignDefault = true
        return entry
      }

      return {
        ...entry,
        is_default: undefined,
      }
    })

    if (combinationsWithSingleDefault.length) {
      acc[normalizedType] = combinationsWithSingleDefault
    }

    return acc
  }, {})
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const storeModule = req.scope.resolve(Modules.STORE)
    const [store] = await storeModule.listStores({})

    const meta = (store?.metadata ?? {}) as Record<string, unknown>

    const currencies = Array.isArray(meta.cart_currencies) && meta.cart_currencies.length
      ? meta.cart_currencies
      : DEFAULT_CURRENCIES

    const base_currency = typeof meta.cart_base_currency === "string"
      ? meta.cart_base_currency
      : "ILS"

    const cart_mode =
      meta.cart_mode === "standard" ||
      meta.cart_mode === "whatsapp" ||
      meta.cart_mode === "both"
        ? meta.cart_mode
        : "standard"

    const whatsapp_number =
      typeof meta.whatsapp_number === "string" ? meta.whatsapp_number : ""

    const whatsapp_templates = normalizeWhatsAppTemplates(
      meta.whatsapp_templates,
      meta.whatsapp_template
    )
    const whatsapp_template = whatsapp_templates.en

    const free_shipping_threshold =
      typeof meta.free_shipping_threshold === "number"
        ? meta.free_shipping_threshold
        : null
    const variant_combination_defaults_by_type =
      normalizeVariantCombinationDefaultsByType(
        meta.variant_combination_defaults_by_type
      )

    res.json({
      base_currency,
      currencies,
      cart_mode,
      whatsapp_number,
      whatsapp_template,
      whatsapp_templates,
      free_shipping_threshold,
      variant_combination_defaults_by_type,
    })
  } catch {
    res.json({
      base_currency: "ILS",
      currencies: DEFAULT_CURRENCIES,
      cart_mode: "standard",
      whatsapp_number: "",
      whatsapp_template: DEFAULT_WHATSAPP_TEMPLATES.en,
      whatsapp_templates: DEFAULT_WHATSAPP_TEMPLATES,
      free_shipping_threshold: null,
      variant_combination_defaults_by_type: {},
    })
  }
}
