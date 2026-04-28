import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState, useEffect, useMemo } from "react"

// ─── Sidebar icon ─────────────────────────────────────────────────────────────
const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zm12 16a2 2 0 11-4 0 2 2 0 014 0zM6 18a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
)

// ─── Types ─────────────────────────────────────────────────────────────────────
type CurrencyEntry = {
  code: string
  label: string
  symbol: string
  rate: number
  enabled: boolean
}

const DEFAULT_CURRENCIES: CurrencyEntry[] = [
  { code: "ILS", label: "Israeli New Shekel", symbol: "₪", rate: 1,    enabled: true },
  { code: "USD", label: "US Dollar",          symbol: "$", rate: 0.27,  enabled: true },
  { code: "EUR", label: "Euro",               symbol: "€", rate: 0.25,  enabled: true },
  { code: "GBP", label: "British Pound",      symbol: "£", rate: 0.21,  enabled: false },
  { code: "JOD", label: "Jordanian Dinar",    symbol: "JD", rate: 0.19, enabled: false },
  { code: "SAR", label: "Saudi Riyal",        symbol: "SR", rate: 1.01, enabled: false },
  { code: "AED", label: "UAE Dirham",         symbol: "د.إ", rate: 0.99, enabled: false },
]

const WHATSAPP_TEMPLATE_LOCALES = ["en", "ar", "he"] as const

type WhatsAppTemplateLocale = (typeof WHATSAPP_TEMPLATE_LOCALES)[number]
type LocalizedWhatsAppTemplates = Record<WhatsAppTemplateLocale, string>

const WHATSAPP_TEMPLATE_LOCALE_LABELS: Record<WhatsAppTemplateLocale, string> = {
  en: "English",
  ar: "Arabic",
  he: "Hebrew",
}

const DEFAULT_WHATSAPP_TEMPLATES: LocalizedWhatsAppTemplates = {
  en: "Hello! I'd like to order:\n{{items}}\nTotal: {{total}}\n{{customer_note}}",
  ar: "مرحباً! أود طلب:\n{{items}}\nالإجمالي: {{total}}\n{{customer_note}}",
  he: "שלום! אני רוצה להזמין:\n{{items}}\nסה״כ: {{total}}\n{{customer_note}}",
}

type WhatsAppPreviewMode = "pdp" | "cart"
type WhatsAppTemplateValue = string | number | null | undefined
type WhatsAppTemplateReplacements = Record<string, WhatsAppTemplateValue>
type WhatsAppPreviewSample = {
  label: string
  description: string
  replacements: WhatsAppTemplateReplacements
}

type LocalizedWhatsAppPreviewContent = {
  productName: string
  productSpecs: string
  presetTitle: string
  pdpItems: string
  cartItems: string
}

type PreviewProductListItem = {
  id: string
  title: string
  handle: string
}

type PreviewApiKeySalesChannel = {
  id?: string | null
}

type PreviewApiKey = {
  id?: string | null
  token?: string | null
  type?: string | null
  revoked_at?: string | null
  sales_channels?: PreviewApiKeySalesChannel[] | null
}

type PreviewProductOption = {
  id?: string | null
  title?: unknown
}

type PreviewVariantOption = {
  option_id?: string | null
  value?: string | null
}

type PreviewVariantPrice = {
  amount?: number | null
  currency_code?: string | null
}

type PreviewVariantCalculatedPrice = {
  calculated_amount?: number | null
  currency_code?: string | null
}

type PreviewVariant = {
  id?: string | null
  title?: string | null
  options?: PreviewVariantOption[] | null
  prices?: PreviewVariantPrice[] | null
  calculated_price?: PreviewVariantCalculatedPrice | null
}

type PreviewProduct = {
  id?: string | null
  title?: string | null
  handle?: string | null
  options?: PreviewProductOption[] | null
  variants?: PreviewVariant[] | null
  metadata?: Record<string, unknown> | null
}

type PreviewSelectionRow = {
  label: string
  value: string
}

type PreviewVariantCombination = {
  title: string
  optionValues: Record<string, string>
}

const DEFAULT_PREVIEW_QUANTITY = "2"
const PREVIEW_STORE_PRODUCT_LIST_FIELDS = "id,title,handle"
const PREVIEW_STORE_PRODUCT_FIELDS =
  "id,title,handle,description,*options,+metadata,*variants,*variants.options,*variants.prices"

const WHATSAPP_SETUP_LABELS: Record<WhatsAppTemplateLocale, string> = {
  en: "Setup",
  ar: "الإعداد",
  he: "הגדרה",
}

const WHATSAPP_CUSTOMER_NOTE_LABELS: Record<WhatsAppTemplateLocale, string> = {
  en: "Note",
  ar: "ملاحظة",
  he: "הערה",
}

const DEFAULT_PREVIEW_CUSTOMER_NOTES: Record<WhatsAppTemplateLocale, string> = {
  en: "Please ring the bell when you arrive.",
  ar: "يرجى الاتصال بالجرس عند الوصول.",
  he: "נא לצלצל בפעמון כשאתם מגיעים.",
}

const WHATSAPP_PREVIEW_CONTENT: Record<
  WhatsAppTemplateLocale,
  LocalizedWhatsAppPreviewContent
> = {
  en: {
    productName: "NEXMART Air Pro 15",
    productSpecs: "Color: Midnight, Storage: 512GB, Setup: Creator Bundle",
    presetTitle: "Creator Bundle",
    pdpItems:
      "2x NEXMART Air Pro 15 (Color: Midnight, Storage: 512GB, Setup: Creator Bundle)",
    cartItems:
      "1x NEXMART Air Pro 15 (Color: Midnight, Storage: 512GB)\n2x Orbit Desk Hub (Ports: USB-C, Finish: Matte Black, Setup: Workstation Pack)",
  },
  ar: {
    productName: "نيكس مارت إير برو 15",
    productSpecs: "اللون: ليلي، السعة: 512 جيجابايت، الإعداد: باقة المبدعين",
    presetTitle: "باقة المبدعين",
    pdpItems:
      "2x نيكس مارت إير برو 15 (اللون: ليلي، السعة: 512 جيجابايت، الإعداد: باقة المبدعين)",
    cartItems:
      "1x نيكس مارت إير برو 15 (اللون: ليلي، السعة: 512 جيجابايت)\n2x أوربت دِسك هَب (المنافذ: USB-C، اللمسة: أسود مطفي، الإعداد: باقة العمل)",
  },
  he: {
    productName: "נקסמארט אייר פרו 15",
    productSpecs: "צבע: כחול לילה, נפח: 512GB, הגדרה: חבילת יוצרים",
    presetTitle: "חבילת יוצרים",
    pdpItems:
      "2x נקסמארט אייר פרו 15 (צבע: כחול לילה, נפח: 512GB, הגדרה: חבילת יוצרים)",
    cartItems:
      "1x נקסמארט אייר פרו 15 (צבע: כחול לילה, נפח: 512GB)\n2x אורביט דסק האב (חיבורים: USB-C, גימור: שחור מט, הגדרה: חבילת עבודה)",
  },
}

const cleanWhatsAppTemplate = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizeWhatsAppTemplates(
  value: unknown,
  legacyTemplate?: unknown
): LocalizedWhatsAppTemplates {
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

function normalizeWhatsAppNumber(input: string) {
  return input.replace(/[^\d]/g, "")
}

function applyWhatsAppTemplate(
  template: string,
  replacements: WhatsAppTemplateReplacements
) {
  return template
    .replace(/\r\n/g, "\n")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (!Object.prototype.hasOwnProperty.call(replacements, key)) {
        return match
      }

      const value = replacements[key]

      return value === null || value === undefined ? "" : String(value)
    })
    .trim()
}

function buildWhatsAppCustomerNote({
  note,
  label,
}: {
  note: string | null | undefined
  label: string
}) {
  const trimmedNote = typeof note === "string" ? note.trim() : ""

  if (!trimmedNote) {
    return ""
  }

  return `${label}: ${trimmedNote}`
}

const normalizePreviewLocale = (
  locale: string | null | undefined
): WhatsAppTemplateLocale => {
  if (locale === "ar" || locale === "he") {
    return locale
  }

  return "en"
}

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const getCurrencyLocale = (locale: WhatsAppTemplateLocale) => {
  if (locale === "ar") {
    return "ar"
  }

  if (locale === "he") {
    return "he-IL"
  }

  return "en-US"
}

const getLocalizedPreviewText = (
  value: unknown,
  locale: string | null | undefined
) => {
  if (typeof value === "string") {
    return value.trim()
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ""
  }

  const record = value as Record<string, unknown>
  const normalizedLocale = normalizePreviewLocale(locale)

  const directMatch = record[normalizedLocale]

  if (typeof directMatch === "string" && directMatch.trim()) {
    return directMatch.trim()
  }

  const englishFallback = record.en

  if (typeof englishFallback === "string" && englishFallback.trim()) {
    return englishFallback.trim()
  }

  const firstText = Object.values(record).find(
    (entry): entry is string => typeof entry === "string" && !!entry.trim()
  )

  return firstText?.trim() ?? ""
}

const getPreviewTextCandidates = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [] as string[]
  }

  return Object.values(value as Record<string, unknown>)
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const buildLocalizedWhatsAppSelectionRows = ({
  product,
  variantOptions,
  locale,
}: {
  product?: PreviewProduct | null
  variantOptions?: PreviewVariantOption[] | null
  locale: string | null | undefined
}) => {
  const selectedValuesByOptionId = (variantOptions ?? []).reduce<Record<string, string>>(
    (acc, option) => {
      const optionId = normalizeText(option?.option_id)
      const optionValue = normalizeText(option?.value)

      if (optionId && optionValue) {
        acc[optionId] = optionValue
      }

      return acc
    },
    {}
  )

  if (!product?.options?.length || !Object.keys(selectedValuesByOptionId).length) {
    return [] as PreviewSelectionRow[]
  }

  const optionRows = (product.options ?? []).reduce<
    Array<PreviewSelectionRow & { optionId: string; candidates: string[] }>
  >((acc, option) => {
    const optionId = normalizeText(option.id)

    if (!optionId) {
      return acc
    }

    const value = selectedValuesByOptionId[optionId]

    if (!value) {
      return acc
    }

    const label = getLocalizedPreviewText(option.title, locale)
    const candidates = Array.from(
      new Set([label, ...getPreviewTextCandidates(option.title)].filter(Boolean))
    )

    acc.push({
      optionId,
      label: label || candidates[0] || optionId,
      value,
      candidates,
    })

    return acc
  }, [])

  if (!optionRows.length) {
    return [] as PreviewSelectionRow[]
  }

  const rawSpecifications = product.metadata?.specifications
  const linkedSpecificationRows = Array.isArray(rawSpecifications)
    ? rawSpecifications
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null
          }

          const record = entry as Record<string, unknown>
          const label = getLocalizedPreviewText(record.label, locale)
          const optionId = normalizeText(record.option_id) || undefined
          const optionReferences = getPreviewTextCandidates(record.option)

          if (!label || (!optionId && !optionReferences.length)) {
            return null
          }

          return {
            label,
            optionId,
            optionReferences,
          }
        })
        .filter(
          (
            entry
          ): entry is {
            label: string
            optionId: string | undefined
            optionReferences: string[]
          } => !!entry
        )
    : []

  const normalizeCandidate = (value: string) => value.trim().toLowerCase()
  const usedOptionIds = new Set<string>()
  const selectionRows: PreviewSelectionRow[] = []

  for (const specification of linkedSpecificationRows) {
    const matchedOption = optionRows.find((optionRow) => {
      if (specification.optionId && specification.optionId === optionRow.optionId) {
        return true
      }

      return specification.optionReferences.some((reference) => {
        const normalizedReference = normalizeCandidate(reference)

        return optionRow.candidates.some(
          (candidate) => normalizeCandidate(candidate) === normalizedReference
        )
      })
    })

    if (!matchedOption) {
      continue
    }

    usedOptionIds.add(matchedOption.optionId)
    selectionRows.push({
      label: specification.label,
      value: matchedOption.value,
    })
  }

  for (const optionRow of optionRows) {
    if (usedOptionIds.has(optionRow.optionId)) {
      continue
    }

    selectionRows.push({
      label: optionRow.label,
      value: optionRow.value,
    })
  }

  return selectionRows.filter(
    (row, index, collection) =>
      collection.findIndex(
        (entry) =>
          normalizeCandidate(entry.label) === normalizeCandidate(row.label) &&
          normalizeCandidate(entry.value) === normalizeCandidate(row.value)
      ) === index
  )
}

const parsePreviewVariantCombinations = (
  metadata?: Record<string, unknown> | null
) => {
  const rawValue = metadata?.variant_combinations

  if (!Array.isArray(rawValue)) {
    return [] as PreviewVariantCombination[]
  }

  return rawValue
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const record = entry as Record<string, unknown>
      const title = normalizeText(record.title)
      const optionValues = Object.entries(
        (record.option_values as Record<string, unknown> | undefined) ?? {}
      ).reduce<Record<string, string>>((acc, [key, value]) => {
        const normalizedKey = normalizeText(key)
        const normalizedValue = normalizeText(value)

        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue
        }

        return acc
      }, {})

      if (!title || !Object.keys(optionValues).length) {
        return null
      }

      return {
        title,
        optionValues,
      } satisfies PreviewVariantCombination
    })
    .filter((entry): entry is PreviewVariantCombination => !!entry)
}

const findMatchingPreviewVariantCombination = ({
  product,
  variant,
}: {
  product?: PreviewProduct | null
  variant?: PreviewVariant | null
}) => {
  if (!product || !variant) {
    return null
  }

  const optionTitleById = (product.options ?? []).reduce<Record<string, string>>(
    (acc, option) => {
      const optionId = normalizeText(option.id)
      const optionTitle = normalizeText(option.title)

      if (optionId && optionTitle) {
        acc[optionId] = optionTitle
      }

      return acc
    },
    {}
  )

  const variantOptionValuesByTitle = (variant.options ?? []).reduce<Record<string, string>>(
    (acc, option) => {
      const optionId = normalizeText(option.option_id)
      const optionValue = normalizeText(option.value)
      const optionTitle = optionTitleById[optionId]

      if (optionTitle && optionValue) {
        acc[optionTitle] = optionValue
      }

      return acc
    },
    {}
  )

  return (
    parsePreviewVariantCombinations(product.metadata).find((combination) =>
      Object.entries(combination.optionValues).every(
        ([optionTitle, optionValue]) =>
          normalizeText(variantOptionValuesByTitle[optionTitle]) ===
          normalizeText(optionValue)
      )
    ) ?? null
  )
}

const getPreviewVariantAmount = ({
  variant,
  currencyCode,
}: {
  variant?: PreviewVariant | null
  currencyCode: string
}) => {
  const normalizedCurrency = currencyCode.trim().toLowerCase()
  const calculatedCurrency = normalizeText(variant?.calculated_price?.currency_code)

  if (
    typeof variant?.calculated_price?.calculated_amount === "number" &&
    (!calculatedCurrency || calculatedCurrency.toLowerCase() === normalizedCurrency)
  ) {
    return variant.calculated_price.calculated_amount
  }

  const price = (variant?.prices ?? []).find(
    (entry) =>
      normalizeText(entry.currency_code).toLowerCase() === normalizedCurrency &&
      typeof entry.amount === "number"
  )

  return typeof price?.amount === "number" ? price.amount : null
}

const formatPreviewMoney = ({
  amount,
  currencyCode,
  locale,
}: {
  amount: number
  currencyCode: string
  locale: WhatsAppTemplateLocale
}) => {
  try {
    return new Intl.NumberFormat(getCurrencyLocale(locale), {
      style: "currency",
      currency: currencyCode,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--ui-bg-base)",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 12,
  padding: "24px 28px",
  marginBottom: 20,
}
const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ui-fg-subtle)",
  marginBottom: 6,
}
const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--ui-border-base)",
  background: "var(--ui-bg-field)",
  color: "var(--ui-fg-base)",
  fontSize: 14,
  outline: "none",
}
const select: React.CSSProperties = { ...input }
const btnPrimary: React.CSSProperties = {
  padding: "9px 22px",
  borderRadius: 8,
  background: "var(--ui-button-inverted)",
  color: "var(--ui-fg-on-inverted)",
  fontSize: 14,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
}
const btnSecondary: React.CSSProperties = {
  padding: "9px 22px",
  borderRadius: 8,
  background: "var(--ui-bg-base)",
  color: "var(--ui-fg-base)",
  fontSize: 14,
  fontWeight: 600,
  border: "1px solid var(--ui-border-base)",
  cursor: "pointer",
}
const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 4,
}
const sectionSubtitle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ui-fg-subtle)",
  marginBottom: 20,
}

// ─── Page ──────────────────────────────────────────────────────────────────────
function CartSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState("")
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  // Settings
  const [baseCurrency, setBaseCurrency] = useState("ILS")
  const [currencies, setCurrencies] = useState<CurrencyEntry[]>(DEFAULT_CURRENCIES)
  const [whatsapp, setWhatsapp] = useState("")
  const [whatsappTemplates, setWhatsappTemplates] =
    useState<LocalizedWhatsAppTemplates>(DEFAULT_WHATSAPP_TEMPLATES)
  const [activeTemplateLocale, setActiveTemplateLocale] =
    useState<WhatsAppTemplateLocale>("en")
  const [cartMode, setCartMode] = useState<"standard" | "whatsapp" | "both">("both")
  const [previewMode, setPreviewMode] = useState<WhatsAppPreviewMode>("pdp")
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("")
  const [previewProductsLoading, setPreviewProductsLoading] = useState(false)
  const [previewProductLoading, setPreviewProductLoading] = useState(false)
  const [previewProducts, setPreviewProducts] = useState<PreviewProductListItem[]>([])
  const [previewProductId, setPreviewProductId] = useState("")
  const [previewProduct, setPreviewProduct] = useState<PreviewProduct | null>(null)
  const [previewPublishableKey, setPreviewPublishableKey] = useState("")
  const [previewVariantId, setPreviewVariantId] = useState("")
  const [previewQuantity, setPreviewQuantity] = useState(DEFAULT_PREVIEW_QUANTITY)
  const [previewCustomerNotes, setPreviewCustomerNotes] = useState(
    DEFAULT_PREVIEW_CUSTOMER_NOTES
  )
  const [previewDataError, setPreviewDataError] = useState<string | null>(null)

  useEffect(() => {
    loadStore()
  }, [])

  useEffect(() => {
    if (!previewPublishableKey) {
      return
    }

    loadPreviewProducts()
  }, [activeTemplateLocale, previewPublishableKey])

  useEffect(() => {
    if (!previewPublishableKey || !previewProductId) {
      return
    }

    loadPreviewProduct(previewProductId)
  }, [activeTemplateLocale, previewProductId, previewPublishableKey])

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  async function loadStore() {
    setLoading(true)
    try {
      const res = await fetch("/admin/stores", { credentials: "include" })
      const data = await res.json()
      const store = Array.isArray(data.stores) ? data.stores[0] : data.store
      if (store) {
        setStoreId(store.id)
        const m = (store.metadata ?? {}) as Record<string, unknown>
        if (m.cart_base_currency) setBaseCurrency(m.cart_base_currency as string)
        if (Array.isArray(m.cart_currencies) && m.cart_currencies.length) {
          setCurrencies(m.cart_currencies as CurrencyEntry[])
        }
        if (m.whatsapp_number) setWhatsapp(m.whatsapp_number as string)
        setWhatsappTemplates(
          normalizeWhatsAppTemplates(
            m.whatsapp_templates,
            m.whatsapp_template
          )
        )
        if (m.cart_mode) setCartMode(m.cart_mode as "standard" | "whatsapp" | "both")
        if (m.free_shipping_threshold) setFreeShippingThreshold(String(m.free_shipping_threshold))
      }

      const nextPreviewPublishableKey = await loadPreviewPublishableKey({
        publishableApiKeyId: normalizeText(
          (store?.metadata as Record<string, unknown> | null | undefined)
            ?.publishable_api_key_id
        ),
        salesChannelId:
          normalizeText(store?.default_sales_channel_id) ||
          normalizeText(
            (store?.metadata as Record<string, unknown> | null | undefined)?.sales_channel_id
          ),
      })

      if (!nextPreviewPublishableKey) {
        setPreviewDataError("Could not load a publishable API key for live preview.")
      }

      setPreviewPublishableKey(nextPreviewPublishableKey)
    } catch {
      showToast("err", "Could not load store settings")
    } finally {
      setLoading(false)
    }
  }

  async function loadPreviewPublishableKey({
    publishableApiKeyId,
    salesChannelId,
  }: {
    publishableApiKeyId?: string
    salesChannelId?: string
  }) {
    const res = await fetch("/admin/api-keys?limit=100", {
      credentials: "include",
    })

    if (!res.ok) {
      throw new Error("Failed to load publishable API keys")
    }

    const json = (await res.json()) as {
      api_keys?: PreviewApiKey[]
    }

    const publishableKeys = (json.api_keys ?? []).filter(
      (entry) =>
        normalizeText(entry.type) === "publishable" &&
        !normalizeText(entry.revoked_at) &&
        normalizeText(entry.token)
    )

    const keyById = publishableApiKeyId
      ? publishableKeys.find(
          (entry) => normalizeText(entry.id) === normalizeText(publishableApiKeyId)
        )
      : undefined

    if (keyById) {
      return normalizeText(keyById.token)
    }

    const keyBySalesChannel = salesChannelId
      ? publishableKeys.find((entry) =>
          (entry.sales_channels ?? []).some(
            (salesChannel) =>
              normalizeText(salesChannel?.id) === normalizeText(salesChannelId)
          )
        )
      : undefined

    if (keyBySalesChannel) {
      return normalizeText(keyBySalesChannel.token)
    }

    if (publishableApiKeyId || salesChannelId) {
      return ""
    }

    return normalizeText(publishableKeys[0]?.token)
  }

  function getPreviewStoreHeaders() {
    return {
      "x-medusa-locale": activeTemplateLocale,
      "x-publishable-api-key": previewPublishableKey,
    }
  }

  async function loadPreviewProducts() {
    setPreviewProductsLoading(true)
    setPreviewDataError(null)

    try {
      if (!previewPublishableKey) {
        throw new Error("Missing publishable API key")
      }

      const res = await fetch(
        `/store/products?limit=100&fields=${encodeURIComponent(
          PREVIEW_STORE_PRODUCT_LIST_FIELDS
        )}`,
        {
          headers: getPreviewStoreHeaders(),
        }
      )

      if (!res.ok) {
        throw new Error("Failed to load products")
      }

      const json = (await res.json()) as {
        products?: Array<Record<string, unknown>>
      }

      const nextProducts = (json.products ?? [])
        .map((entry) => {
          const id = normalizeText(entry.id)
          const title = normalizeText(entry.title)
          const handle = normalizeText(entry.handle)

          if (!id) {
            return null
          }

          return {
            id,
            title: title || handle || id,
            handle,
          } satisfies PreviewProductListItem
        })
        .filter((entry): entry is PreviewProductListItem => !!entry)

      setPreviewProducts(nextProducts)
      setPreviewProductId((current) => {
        if (current && nextProducts.some((product) => product.id === current)) {
          return current
        }

        return nextProducts[0]?.id ?? ""
      })

      if (!nextProducts.length) {
        setPreviewProduct(null)
        setPreviewVariantId("")
      }
    } catch {
      setPreviewDataError("Could not load products for live preview.")
      setPreviewProducts([])
      setPreviewProduct(null)
      setPreviewVariantId("")
    } finally {
      setPreviewProductsLoading(false)
    }
  }

  async function loadPreviewProduct(productId: string) {
    setPreviewProductLoading(true)
    setPreviewDataError(null)

    try {
      if (!previewPublishableKey) {
        throw new Error("Missing publishable API key")
      }

      const res = await fetch(
        `/store/products/${productId}?fields=${encodeURIComponent(
          PREVIEW_STORE_PRODUCT_FIELDS
        )}`,
        {
          headers: getPreviewStoreHeaders(),
        }
      )

      if (!res.ok) {
        throw new Error("Failed to load preview product")
      }

      const json = (await res.json()) as {
        product?: PreviewProduct
      }

      const nextProduct = json.product ?? null
      const nextVariants = Array.isArray(nextProduct?.variants)
        ? (nextProduct?.variants ?? []).filter(
            (variant): variant is PreviewVariant => !!normalizeText(variant.id)
          )
        : []

      setPreviewProduct(nextProduct)
      setPreviewVariantId((current) => {
        if (current && nextVariants.some((variant) => variant.id === current)) {
          return current
        }

        return normalizeText(nextVariants[0]?.id) || ""
      })
    } catch {
      setPreviewDataError("Could not load the selected product for preview.")
      setPreviewProduct(null)
      setPreviewVariantId("")
    } finally {
      setPreviewProductLoading(false)
    }
  }

  async function save() {
    if (!storeId) return
    setSaving(true)
    try {
      const normalizedWhatsAppNumber = normalizeWhatsAppNumber(whatsapp)

      if (
        (cartMode === "whatsapp" || cartMode === "both") &&
        !normalizedWhatsAppNumber
      ) {
        throw new Error("Enter a WhatsApp number before enabling WhatsApp ordering.")
      }

      if (
        normalizedWhatsAppNumber.startsWith("972") &&
        normalizedWhatsAppNumber.length < 11
      ) {
        throw new Error(
          "WhatsApp number looks incomplete. For Israel, enter the full international number and drop only the leading 0. Example: 972501234567."
        )
      }

      const normalizedWhatsAppTemplates = normalizeWhatsAppTemplates(
        whatsappTemplates
      )
      const res = await fetch(`/admin/stores/${storeId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            cart_base_currency: baseCurrency,
            cart_currencies: currencies,
            whatsapp_number: whatsapp.trim(),
            whatsapp_template: normalizedWhatsAppTemplates.en,
            whatsapp_templates: normalizedWhatsAppTemplates,
            cart_mode: cartMode,
            free_shipping_threshold: freeShippingThreshold ? Number(freeShippingThreshold) : null,
          },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setWhatsappTemplates(normalizedWhatsAppTemplates)
      showToast("ok", "Cart settings saved")
    } catch (e: any) {
      showToast("err", e.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  function updateCurrencyRate(code: string, rate: string) {
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, rate: parseFloat(rate) || c.rate } : c))
    )
  }

  function toggleCurrency(code: string) {
    if (code === baseCurrency) return // can't disable the base
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, enabled: !c.enabled } : c))
    )
  }

  function updateWhatsAppTemplate(locale: WhatsAppTemplateLocale, value: string) {
    setWhatsappTemplates((prev) => ({
      ...prev,
      [locale]: value,
    }))
  }

  const enabledCurrencies = currencies.filter((c) => c.enabled)
  const baseCurrencySymbol =
    currencies.find((c) => c.code === baseCurrency)?.symbol ?? baseCurrency
  const activeWhatsAppTemplate =
    whatsappTemplates[activeTemplateLocale] ??
    DEFAULT_WHATSAPP_TEMPLATES[activeTemplateLocale]
  const previewVariants = useMemo(
    () =>
      Array.isArray(previewProduct?.variants)
        ? (previewProduct?.variants ?? []).filter(
            (variant): variant is PreviewVariant => !!normalizeText(variant.id)
          )
        : [],
    [previewProduct]
  )
  const selectedPreviewVariant = useMemo(
    () =>
      previewVariants.find((variant) => normalizeText(variant.id) === previewVariantId) ??
      previewVariants[0] ??
      null,
    [previewVariantId, previewVariants]
  )
  const previewQuantityNumber = Math.max(
    1,
    Number.parseInt(previewQuantity, 10) || 1
  )
  const activePreviewCustomerNote =
    previewCustomerNotes[activeTemplateLocale] ?? ""
  const liveWhatsAppPreview = useMemo<WhatsAppPreviewSample | null>(() => {
    if (!previewProduct || !selectedPreviewVariant) {
      return null
    }

    const productTitle = normalizeText(previewProduct.title)
    const variantTitle = normalizeText(selectedPreviewVariant.title)
    const selectionRows = buildLocalizedWhatsAppSelectionRows({
      product: previewProduct,
      variantOptions: selectedPreviewVariant.options,
      locale: activeTemplateLocale,
    })
    const matchingCombination = findMatchingPreviewVariantCombination({
      product: previewProduct,
      variant: selectedPreviewVariant,
    })
    const setupLabel = WHATSAPP_SETUP_LABELS[activeTemplateLocale]
    const productSpecs = [
      selectionRows.map((row) => `${row.label}: ${row.value}`).join(", "),
      matchingCombination?.title ? `${setupLabel}: ${matchingCombination.title}` : "",
    ]
      .filter(Boolean)
      .join(", ")
    const fallbackVariantTitle =
      variantTitle && variantTitle.toLowerCase() !== "default variant"
        ? variantTitle
        : ""
    const cartDetailParts = [
      ...selectionRows.map((row) => `${row.label}: ${row.value}`),
      !selectionRows.length ? fallbackVariantTitle : "",
      matchingCombination?.title ? `${setupLabel}: ${matchingCombination.title}` : "",
    ].filter(Boolean)
    const unitAmount = getPreviewVariantAmount({
      variant: selectedPreviewVariant,
      currencyCode: baseCurrency,
    })
    const unitPrice =
      typeof unitAmount === "number"
        ? formatPreviewMoney({
            amount: unitAmount,
            currencyCode: baseCurrency,
            locale: activeTemplateLocale,
          })
        : ""
    const lineTotalAmount =
      typeof unitAmount === "number" ? unitAmount * previewQuantityNumber : null
    const lineTotal =
      typeof lineTotalAmount === "number"
        ? formatPreviewMoney({
            amount: lineTotalAmount,
            currencyCode: baseCurrency,
            locale: activeTemplateLocale,
          })
        : ""
    const customerNote = buildWhatsAppCustomerNote({
      note: activePreviewCustomerNote,
      label: WHATSAPP_CUSTOMER_NOTE_LABELS[activeTemplateLocale],
    })

    if (previewMode === "pdp") {
      const itemLine = [
        productTitle,
        productSpecs ? `(${productSpecs})` : "",
        unitPrice ? `- ${unitPrice}` : "",
      ]
        .filter(Boolean)
        .join(" ")

      return {
        label: `PDP preview · ${productTitle || "Selected product"}`,
        description:
          "Uses the selected product, variant, and quantity below to render the same placeholders the storefront PDP fills for click-to-order.",
        replacements: {
          items: `${previewQuantityNumber}x ${itemLine}`,
          total: lineTotal,
          currency: baseCurrency,
          quantity: previewQuantityNumber,
          product_name: productTitle,
          product_specs: productSpecs,
          unit_price: unitPrice,
          line_total: lineTotal,
          preset_title: matchingCombination?.title ?? "",
          customer_note: customerNote,
        },
      }
    }

    return {
      label: `Cart preview · ${productTitle || "Selected product"}`,
      description:
        "Uses the selected product and variant as a live cart-line preview. Product-specific placeholders stay blank here, matching the storefront cart flow.",
      replacements: {
        items: `${previewQuantityNumber}x ${productTitle}${
          cartDetailParts.length ? ` (${cartDetailParts.join(", ")})` : ""
        }`,
        total: lineTotal,
        currency: baseCurrency,
        quantity: previewQuantityNumber,
        product_name: "",
        product_specs: "",
        unit_price: "",
        line_total: lineTotal,
        preset_title: "",
        customer_note: customerNote,
      },
    }
  }, [
    activePreviewCustomerNote,
    activeTemplateLocale,
    baseCurrency,
    previewMode,
    previewProduct,
    previewQuantityNumber,
    previewVariantId,
    selectedPreviewVariant,
  ])

  const whatsappPreviewSamples = useMemo<
    Record<WhatsAppTemplateLocale, Record<WhatsAppPreviewMode, WhatsAppPreviewSample>>
  >(() => {
    const money = (amount: number) => `${baseCurrencySymbol}${amount.toFixed(2)}`
    const previewContent = WHATSAPP_PREVIEW_CONTENT

    return {
      en: {
        pdp: {
          label: "PDP click-to-order example",
          description:
            "Shows how product-specific placeholders are filled when a shopper orders directly from the product page.",
          replacements: {
            items: `${previewContent.en.pdpItems} - ${money(799)}`,
            total: money(1598),
            currency: baseCurrency,
            quantity: 2,
            product_name: previewContent.en.productName,
            product_specs: previewContent.en.productSpecs,
            unit_price: money(799),
            line_total: money(1598),
            preset_title: previewContent.en.presetTitle,
            customer_note: buildWhatsAppCustomerNote({
              note: previewCustomerNotes.en,
              label: WHATSAPP_CUSTOMER_NOTE_LABELS.en,
            }),
          },
        },
        cart: {
          label: "Cart summary example",
          description:
            "Shows a multi-item cart message. Product-specific placeholders stay blank here, matching the storefront cart flow.",
          replacements: {
            items: previewContent.en.cartItems,
            total: money(1097),
            currency: baseCurrency,
            quantity: 3,
            product_name: "",
            product_specs: "",
            unit_price: "",
            line_total: "",
            preset_title: "",
            customer_note: buildWhatsAppCustomerNote({
              note: previewCustomerNotes.en,
              label: WHATSAPP_CUSTOMER_NOTE_LABELS.en,
            }),
          },
        },
      },
      ar: {
        pdp: {
          label: "معاينة طلب واتساب من صفحة المنتج",
          description:
            "توضح كيف تمتلئ الحقول الخاصة بالمنتج عندما يطلب المتسوق مباشرة من صفحة المنتج.",
          replacements: {
            items: `${previewContent.ar.pdpItems} - ${money(799)}`,
            total: money(1598),
            currency: baseCurrency,
            quantity: 2,
            product_name: previewContent.ar.productName,
            product_specs: previewContent.ar.productSpecs,
            unit_price: money(799),
            line_total: money(1598),
            preset_title: previewContent.ar.presetTitle,
            customer_note: buildWhatsAppCustomerNote({
              note: previewCustomerNotes.ar,
              label: WHATSAPP_CUSTOMER_NOTE_LABELS.ar,
            }),
          },
        },
        cart: {
          label: "معاينة رسالة سلة واتساب",
          description:
            "توضح رسالة سلة متعددة المنتجات. الحقول الخاصة بمنتج واحد تبقى فارغة هنا مثل سلوك المتجر.",
          replacements: {
            items: previewContent.ar.cartItems,
            total: money(1097),
            currency: baseCurrency,
            quantity: 3,
            product_name: "",
            product_specs: "",
            unit_price: "",
            line_total: "",
            preset_title: "",
            customer_note: buildWhatsAppCustomerNote({
              note: previewCustomerNotes.ar,
              label: WHATSAPP_CUSTOMER_NOTE_LABELS.ar,
            }),
          },
        },
      },
      he: {
        pdp: {
          label: "תצוגה מקדימה להזמנת ווטסאפ מעמוד מוצר",
          description:
            "מציגה איך השדות הייעודיים למוצר מתמלאים כשהלקוח מזמין ישירות מעמוד המוצר.",
          replacements: {
            items: `${previewContent.he.pdpItems} - ${money(799)}`,
            total: money(1598),
            currency: baseCurrency,
            quantity: 2,
            product_name: previewContent.he.productName,
            product_specs: previewContent.he.productSpecs,
            unit_price: money(799),
            line_total: money(1598),
            preset_title: previewContent.he.presetTitle,
            customer_note: buildWhatsAppCustomerNote({
              note: previewCustomerNotes.he,
              label: WHATSAPP_CUSTOMER_NOTE_LABELS.he,
            }),
          },
        },
        cart: {
          label: "תצוגה מקדימה להודעת עגלה בוואטסאפ",
          description:
            "מציגה הודעת עגלה עם כמה פריטים. השדות של מוצר בודד נשארים ריקים כאן, כמו בזרימת העגלה בחנות.",
          replacements: {
            items: previewContent.he.cartItems,
            total: money(1097),
            currency: baseCurrency,
            quantity: 3,
            product_name: "",
            product_specs: "",
            unit_price: "",
            line_total: "",
            preset_title: "",
            customer_note: buildWhatsAppCustomerNote({
              note: previewCustomerNotes.he,
              label: WHATSAPP_CUSTOMER_NOTE_LABELS.he,
            }),
          },
        },
      },
    }
  }, [baseCurrency, baseCurrencySymbol, previewCustomerNotes])

  const activeWhatsAppPreview =
    liveWhatsAppPreview ?? whatsappPreviewSamples[activeTemplateLocale][previewMode]

  const previewMessage = useMemo(() => {
    const renderedMessage = applyWhatsAppTemplate(
      activeWhatsAppTemplate.trim()
        ? activeWhatsAppTemplate
        : DEFAULT_WHATSAPP_TEMPLATES[activeTemplateLocale],
      activeWhatsAppPreview.replacements
    )
    const customerNote = normalizeText(
      activeWhatsAppPreview.replacements.customer_note
    )
    const activeTemplate = activeWhatsAppTemplate.trim()
      ? activeWhatsAppTemplate
      : DEFAULT_WHATSAPP_TEMPLATES[activeTemplateLocale]

    if (
      customerNote &&
      !/\{\{\s*customer_note\s*\}\}/.test(activeTemplate)
    ) {
      return `${renderedMessage}\n${customerNote}`
    }

    return renderedMessage
  }, [
    activeTemplateLocale,
    activeWhatsAppPreview.replacements,
    activeWhatsAppTemplate,
  ])

  const normalizedWhatsAppNumber = useMemo(
    () => normalizeWhatsAppNumber(whatsapp),
    [whatsapp]
  )

  const whatsappNumberHint = useMemo(() => {
    if (!normalizedWhatsAppNumber) {
      return "We remove spaces and punctuation automatically. Enter the full international number; '+' is optional."
    }

    if (
      normalizedWhatsAppNumber.startsWith("972") &&
      normalizedWhatsAppNumber.length < 11
    ) {
      return `This currently becomes ${normalizedWhatsAppNumber}. For Israel, drop only the local leading 0. Example: 972501234567.`
    }

    return `wa.me will use ${normalizedWhatsAppNumber}.`
  }, [normalizedWhatsAppNumber])

  const previewLink = useMemo(() => {
    if (!normalizedWhatsAppNumber) {
      return ""
    }

    return `https://wa.me/${normalizedWhatsAppNumber}?text=${encodeURIComponent(
      previewMessage
    )}`
  }, [normalizedWhatsAppNumber, previewMessage])

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--ui-fg-subtle)", fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--ui-fg-base)", margin: 0 }}>
          Cart Settings
        </h1>
        <p style={{ fontSize: 14, color: "var(--ui-fg-subtle)", marginTop: 6 }}>
          Configure currency display, checkout mode, and WhatsApp ordering.
        </p>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          padding: "12px 18px",
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 14,
          fontWeight: 500,
          background: toast.type === "ok" ? "#d1fae5" : "#fee2e2",
          color: toast.type === "ok" ? "#065f46" : "#991b1b",
          border: `1px solid ${toast.type === "ok" ? "#6ee7b7" : "#fca5a5"}`,
        }}>
          {toast.type === "ok" ? "✓ " : "✗ "}{toast.text}
        </div>
      )}

      {/* ── Section 1: Base currency ── */}
      <div style={card}>
        <div style={sectionTitle}>Base Currency</div>
        <div style={sectionSubtitle}>
          This is the currency stored in Medusa and used for all product prices.
          All other currencies are calculated from this via exchange rates.
        </div>

        <label style={label}>Base Currency (stored in Medusa)</label>
        <select
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
          style={{ ...select, maxWidth: 220 }}
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code} — {c.label}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: "var(--ui-fg-subtle)", marginTop: 8 }}>
          ⚠ Changing this requires re-entering all product prices in the new base currency.
        </p>
      </div>

      {/* ── Section 2: Display currencies & rates ── */}
      <div style={card}>
        <div style={sectionTitle}>Display Currencies &amp; Exchange Rates</div>
        <div style={sectionSubtitle}>
          Enable which currencies appear in the storefront currency picker.
          Rates are relative to the base currency (1 {baseCurrency} = X foreign).
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--ui-border-base)" }}>
              <th style={{ textAlign: "left", padding: "8px 0", color: "var(--ui-fg-subtle)", fontWeight: 600 }}>Enabled</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--ui-fg-subtle)", fontWeight: 600 }}>Currency</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "var(--ui-fg-subtle)", fontWeight: 600 }}>Symbol</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "var(--ui-fg-subtle)", fontWeight: 600 }}>
                Rate (1 {baseCurrency} =)
              </th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "var(--ui-fg-subtle)", fontWeight: 600 }}>Example (100 {baseCurrency})</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => {
              const isBase = c.code === baseCurrency
              return (
                <tr
                  key={c.code}
                  style={{
                    borderBottom: "1px solid var(--ui-border-base)",
                    opacity: c.enabled ? 1 : 0.45,
                  }}
                >
                  <td style={{ padding: "10px 0" }}>
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      disabled={isBase}
                      onChange={() => toggleCurrency(c.code)}
                      style={{ width: 16, height: 16, cursor: isBase ? "not-allowed" : "pointer" }}
                    />
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: isBase ? 700 : 400, color: "var(--ui-fg-base)" }}>
                    {c.code}
                    {isBase && (
                      <span style={{
                        marginLeft: 6,
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "var(--ui-tag-green-bg)",
                        color: "var(--ui-tag-green-text)",
                        fontWeight: 600,
                      }}>
                        BASE
                      </span>
                    )}
                    <div style={{ fontSize: 11, color: "var(--ui-fg-muted)" }}>{c.label}</div>
                  </td>
                  <td style={{ padding: "10px 0", color: "var(--ui-fg-subtle)" }}>{c.symbol}</td>
                  <td style={{ padding: "10px 0" }}>
                    {isBase ? (
                      <span style={{ color: "var(--ui-fg-muted)", fontSize: 12 }}>1.000 (base)</span>
                    ) : (
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={c.rate}
                        disabled={!c.enabled}
                        onChange={(e) => updateCurrencyRate(c.code, e.target.value)}
                        style={{
                          ...input,
                          width: 100,
                          padding: "5px 8px",
                          fontSize: 13,
                          opacity: c.enabled ? 1 : 0.5,
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: "10px 0", color: "var(--ui-fg-subtle)", fontSize: 12 }}>
                    {c.symbol}{(100 * c.rate).toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "var(--ui-fg-muted)", marginTop: 12 }}>
          After saving, paste these rates into{" "}
          <code style={{ fontSize: 11, background: "var(--ui-bg-subtle)", padding: "1px 4px", borderRadius: 4 }}>
            apps/medusa-storefront/src/lib/config/currencies.ts
          </code>{" "}
          to apply them to the storefront.
        </p>
      </div>

      {/* ── Section 3: Checkout mode ── */}
      <div style={card}>
        <div style={sectionTitle}>Checkout Mode</div>
        <div style={sectionSubtitle}>
          Choose how customers can complete their orders.
        </div>

        {(
          [
            { value: "standard", label: "Standard checkout only", desc: "Full checkout flow (Stripe / PayPal — future)" },
            { value: "whatsapp", label: "WhatsApp order only",     desc: "Generates a pre-filled WhatsApp message instead of a checkout page" },
            { value: "both",     label: "Both options",            desc: "Show both the standard checkout button and a WhatsApp order button" },
          ] as { value: "standard" | "whatsapp" | "both"; label: string; desc: string }[]
        ).map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 8,
              border: `1.5px solid ${cartMode === opt.value ? "var(--ui-border-interactive)" : "var(--ui-border-base)"}`,
              background: cartMode === opt.value ? "var(--ui-bg-highlight)" : "transparent",
              marginBottom: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="cart_mode"
              value={opt.value}
              checked={cartMode === opt.value}
              onChange={() => setCartMode(opt.value)}
              style={{ marginTop: 2 }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ui-fg-base)" }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: "var(--ui-fg-subtle)", marginTop: 2 }}>{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* ── Section 4: WhatsApp ── */}
      {(cartMode === "whatsapp" || cartMode === "both") && (
        <div style={card}>
          <div style={sectionTitle}>WhatsApp Order Settings</div>
          <div style={sectionSubtitle}>
            Configure the WhatsApp number and message template for click-to-order.
          </div>

          <label style={label}>WhatsApp Number (with country code)</label>
          <input
            type="tel"
            placeholder="+972501234567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            style={{ ...input, maxWidth: 280, marginBottom: 18 }}
          />
          <div
            style={{
              fontSize: 12,
              color:
                normalizedWhatsAppNumber.startsWith("972") &&
                normalizedWhatsAppNumber.length < 11
                  ? "var(--ui-fg-error)"
                  : "var(--ui-fg-subtle)",
              marginTop: -10,
              marginBottom: 18,
            }}
          >
            {whatsappNumberHint}
          </div>

          <label style={label}>Message Template</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {WHATSAPP_TEMPLATE_LOCALES.map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setActiveTemplateLocale(locale)}
                data-testid={`whatsapp-template-locale-${locale}`}
                style={{
                  ...btnSecondary,
                  padding: "7px 12px",
                  fontSize: 12,
                  background:
                    activeTemplateLocale === locale
                      ? "var(--ui-bg-highlight)"
                      : "var(--ui-bg-base)",
                  border: `1px solid ${
                    activeTemplateLocale === locale
                      ? "var(--ui-border-interactive)"
                      : "var(--ui-border-base)"
                  }`,
                }}
              >
                {locale.toUpperCase()} · {WHATSAPP_TEMPLATE_LOCALE_LABELS[locale]}
              </button>
            ))}
          </div>
          <textarea
            rows={5}
            value={activeWhatsAppTemplate}
            onChange={(e) =>
              updateWhatsAppTemplate(activeTemplateLocale, e.target.value)
            }
            style={{
              ...input,
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: 13,
            }}
          />
          <p style={{ fontSize: 12, color: "var(--ui-fg-muted)", marginTop: 6 }}>
            Available placeholders: <code>{"{{items}}"}</code> (item list), <code>{"{{total}}"}</code> (order total), <code>{"{{currency}}"}</code>, <code>{"{{quantity}}"}</code>, <code>{"{{product_name}}"}</code>, <code>{"{{product_specs}}"}</code>, <code>{"{{unit_price}}"}</code>, <code>{"{{line_total}}"}</code>, <code>{"{{preset_title}}"}</code>, <code>{"{{customer_note}}"}</code> (optional shopper note from PDP/cart)
            <br />
            Each locale has its own template. You are currently editing <strong>{WHATSAPP_TEMPLATE_LOCALE_LABELS[activeTemplateLocale]}</strong>. PDP click-to-order fills the product-specific placeholders. Cart-level WhatsApp orders keep filling the generic cart placeholders and leave product-specific values blank. If you omit <code>{"{{customer_note}}"}</code>, the shopper note is appended at the end for backwards compatibility.
          </p>

          <div
            style={{
              marginTop: 18,
              border: "1px solid var(--ui-border-base)",
              borderRadius: 10,
              padding: 18,
              background: "var(--ui-bg-subtle)",
            }}
          >
            <div style={{ ...sectionTitle, fontSize: 14, marginBottom: 6 }}>
              Template Preview
            </div>
            <div style={{ fontSize: 12, color: "var(--ui-fg-subtle)", marginBottom: 14 }}>
              Preview follows the selected template locale. Unknown placeholders stay unchanged, matching the storefront behavior.
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                marginBottom: 12,
              }}
            >
              <div>
                <label style={label}>Preview Product</label>
                <select
                  value={previewProductId}
                  onChange={(e) => setPreviewProductId(e.target.value)}
                  disabled={previewProductsLoading || previewProductLoading}
                  style={select}
                  data-testid="cart-settings-preview-product-select"
                >
                  {previewProducts.length ? null : (
                    <option value="">No products available</option>
                  )}
                  {previewProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                      {product.handle ? ` (${product.handle})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label}>Preview Variant</label>
                <select
                  value={previewVariantId}
                  onChange={(e) => setPreviewVariantId(e.target.value)}
                  disabled={previewProductLoading || !previewVariants.length}
                  style={select}
                  data-testid="cart-settings-preview-variant-select"
                >
                  {previewVariants.length ? null : (
                    <option value="">No variants available</option>
                  )}
                  {previewVariants.map((variant) => {
                    const variantId = normalizeText(variant.id)
                    const variantTitle = normalizeText(variant.title) || variantId

                    return (
                      <option key={variantId} value={variantId}>
                        {variantTitle}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label style={label}>Preview Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={previewQuantity}
                  onChange={(e) => setPreviewQuantity(e.target.value)}
                  style={input}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>Preview Customer Note</label>
                <textarea
                  rows={2}
                  value={activePreviewCustomerNote}
                  onChange={(e) =>
                    setPreviewCustomerNotes((current) => ({
                      ...current,
                      [activeTemplateLocale]: e.target.value,
                    }))
                  }
                  style={{
                    ...input,
                    resize: "vertical",
                    minHeight: 80,
                  }}
                  placeholder="Optional shopper note from PDP/cart"
                  data-testid="cart-settings-preview-customer-note"
                />
              </div>
            </div>

            <div style={{ fontSize: 12, color: "var(--ui-fg-subtle)", marginBottom: 12 }}>
              Live preview uses the selected locale and real catalog data from the chosen product and variant. If no live product data is available, the preview falls back to the built-in sample. The customer note field mirrors the new shopper note entry on the storefront.
            </div>

            {previewProductsLoading || previewProductLoading ? (
              <div style={{ fontSize: 12, color: "var(--ui-fg-subtle)", marginBottom: 12 }}>
                Loading preview product data…
              </div>
            ) : null}

            {previewDataError ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#b45309",
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                }}
              >
                {previewDataError}
              </div>
            ) : null}

            {!liveWhatsAppPreview && !previewProductsLoading && !previewProductLoading ? (
              <div style={{ fontSize: 12, color: "var(--ui-fg-muted)", marginBottom: 12 }}>
                Static fallback sample is shown until a product with at least one variant is available for live preview.
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {(
                [
                  { value: "pdp", label: "PDP click-to-order" },
                  { value: "cart", label: "Cart summary" },
                ] as { value: WhatsAppPreviewMode; label: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreviewMode(option.value)}
                  data-testid={`cart-settings-preview-mode-${option.value}`}
                  style={{
                    ...btnSecondary,
                    padding: "7px 12px",
                    fontSize: 12,
                    background:
                      previewMode === option.value
                        ? "var(--ui-bg-highlight)"
                        : "var(--ui-bg-base)",
                    border: `1px solid ${
                      previewMode === option.value
                        ? "var(--ui-border-interactive)"
                        : "var(--ui-border-base)"
                    }`,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "var(--ui-fg-subtle)", marginBottom: 12 }}>
              <strong style={{ color: "var(--ui-fg-base)" }}>
                {activeWhatsAppPreview.label}:
              </strong>{" "}
              {activeWhatsAppPreview.description}
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={label}>Rendered Message</label>
                <pre
                  data-testid="cart-settings-preview-message"
                  style={{
                    margin: 0,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--ui-border-base)",
                    background: "var(--ui-bg-base)",
                    color: "var(--ui-fg-base)",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                  }}
                >
                  {previewMessage}
                </pre>
              </div>

              <div>
                <label style={label}>WhatsApp Link</label>
                <div
                  data-testid="cart-settings-preview-link"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--ui-border-base)",
                    background: "var(--ui-bg-base)",
                    color: previewLink ? "var(--ui-fg-base)" : "var(--ui-fg-muted)",
                    fontSize: 12,
                    wordBreak: "break-all",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                  }}
                >
                  {previewLink ||
                    "Enter a WhatsApp number above to preview the final wa.me link."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 5: Shipping threshold ── */}
      <div style={card}>
        <div style={sectionTitle}>Free Shipping Threshold</div>
        <div style={sectionSubtitle}>
          Show a "free shipping" banner on the cart when the order total exceeds this amount (in base currency).
          Leave blank to disable.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, color: "var(--ui-fg-subtle)" }}>
            {currencies.find((c) => c.code === baseCurrency)?.symbol ?? "₪"}
          </span>
          <input
            type="number"
            min="0"
            placeholder="e.g. 500"
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(e.target.value)}
            style={{ ...input, maxWidth: 180 }}
          />
          <span style={{ fontSize: 13, color: "var(--ui-fg-muted)" }}>{baseCurrency}</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button style={btnSecondary} onClick={loadStore} disabled={saving}>
          Reset
        </button>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

    </div>
  )
}

export const config = defineRouteConfig({
  label: "Cart Settings",
  icon: CartIcon,
})

export default CartSettingsPage
