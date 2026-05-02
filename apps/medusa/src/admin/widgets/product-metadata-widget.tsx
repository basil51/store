import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useRef, useState } from "react"

type ProductWidgetProps = {
  data: {
    id: string
    title?: string | null
    images?: Array<{
      id?: string
      url?: string | null
      rank?: number | null
    }> | null
    metadata?: Record<string, unknown> | null
    type?: {
      value?: string | null
    } | null
    collection?: {
      title?: string | null
    } | null
    categories?: Array<{
      id: string
      name?: string | null
    }> | null
    options?: Array<{
      id: string
      title?: string | null
    }> | null
  }
}

const BADGE_OPTIONS = [
  { value: "", label: "None" },
  { value: "deal", label: "DEAL" },
  { value: "hot", label: "HOT" },
  { value: "new", label: "NEW" },
  { value: "top", label: "TOP" },
]

const STOCK_MODE_OPTIONS = [
  { value: "track_visible", label: "Track stock (show count)" },
  { value: "track_hidden", label: "Track stock (hidden count)" },
  { value: "no_stock", label: "No stock check (always available)" },
]

type SpecificationEntry = {
  group?: string
  label: string
  values?: string[]
  value?: string
  option?: string
}

type SpecificationDraft = {
  id: string
  group: string
  label: string
  mode: "single" | "multiple" | "option"
  value: string
  valuesText: string
  option: string
}

type ProductImageDraft = {
  id?: string
  url: string
}

type ProductSignalSource = {
  value: string
  label: string
}

type VariantCombinationEntry = {
  title: string
  summary?: string
  badge?: string
  is_default?: boolean
  option_values: Record<string, string>
}

type VariantCombinationDraft = {
  id: string
  title: string
  summary: string
  badge: string
  isDefault: boolean
  optionValues: Record<string, string>
}

type VariantCombinationDefaultsByType = Record<string, VariantCombinationEntry[]>

type AdminVariantOptionSnapshot = {
  value?: string | null
  title?: string | null
  option_title?: string | null
  option?: {
    title?: string | null
  } | null
}

type AdminVariantSnapshot = {
  id?: string | null
  title?: string | null
  sku?: string | null
  options?: AdminVariantOptionSnapshot[] | null
}

const SPECIFICATION_TEMPLATES: Array<{
  id: string
  label: string
  description: string
  matchTerms?: string[]
  entries: SpecificationEntry[]
}> = [
  {
    id: "display",
    label: "Display",
    description: "Add common screen and panel details.",
    matchTerms: ["display", "monitor", "screen", "phone", "tablet", "tv", "laptop"],
    entries: [
      { group: "Display", label: "Panel", value: "OLED" },
      { group: "Display", label: "Resolution", value: "" },
      { group: "Display", label: "Refresh Rate", value: "" },
      { group: "Display", label: "Size", value: "" },
    ],
  },
  {
    id: "dimensions",
    label: "Dimensions",
    description: "Insert physical size and weight fields.",
    matchTerms: ["furniture", "table", "chair", "desk", "sofa", "cabinet"],
    entries: [
      { group: "Dimensions", label: "Height", value: "" },
      { group: "Dimensions", label: "Width", value: "" },
      { group: "Dimensions", label: "Depth", value: "" },
      { group: "Dimensions", label: "Weight", value: "" },
    ],
  },
  {
    id: "finish-and-options",
    label: "Finish & Options",
    description: "Start with linked variant choices and finish details.",
    matchTerms: ["fashion", "apparel", "shirt", "pants", "shoes", "clothing"],
    entries: [
      { group: "Finish & Options", label: "Selected Color", option: "Color" },
      { group: "Finish & Options", label: "Selected Size", option: "Size" },
      { group: "Finish & Options", label: "Material", value: "" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    description: "Add core hardware and capacity fields.",
    matchTerms: ["electronics", "phone", "laptop", "computer", "gaming", "tablet"],
    entries: [
      { group: "Performance", label: "Processor", value: "" },
      { group: "Performance", label: "Memory", value: "" },
      { group: "Performance", label: "Storage", value: "" },
      { group: "Performance", label: "Battery", value: "" },
    ],
  },
]

let specificationDraftIdCounter = 0
let variantCombinationDraftIdCounter = 0

function nextSpecificationDraftId() {
  specificationDraftIdCounter += 1
  return `spec-${specificationDraftIdCounter}`
}

function nextVariantCombinationDraftId() {
  variantCombinationDraftIdCounter += 1
  return `combo-${variantCombinationDraftIdCounter}`
}

function normalizeSignalValue(value: string) {
  return value.trim().toLowerCase()
}

function getProductSignalSources(data: ProductWidgetProps["data"]) {
  const sources: ProductSignalSource[] = []

  if (typeof data.title === "string" && data.title.trim()) {
    sources.push({ value: data.title, label: "title" })
  }

  if (typeof data.type?.value === "string" && data.type.value.trim()) {
    sources.push({ value: data.type.value, label: "type" })
  }

  if (
    typeof data.collection?.title === "string" &&
    data.collection.title.trim()
  ) {
    sources.push({ value: data.collection.title, label: "collection" })
  }

  for (const category of data.categories ?? []) {
    if (typeof category.name === "string" && category.name.trim()) {
      sources.push({ value: category.name, label: "category" })
    }
  }

  for (const option of data.options ?? []) {
    if (typeof option.title === "string" && option.title.trim()) {
      sources.push({ value: option.title, label: "option" })
    }
  }

  return sources
}

function findTemplateSignalMatches(
  template: (typeof SPECIFICATION_TEMPLATES)[number],
  signalSources: ProductSignalSource[]
) {
  if (!template.matchTerms?.length) {
    return [] as ProductSignalSource[]
  }

  const matchedSources: ProductSignalSource[] = []

  for (const source of signalSources) {
    const normalizedValue = normalizeSignalValue(source.value)
    const matches = template.matchTerms.some((term) =>
      normalizedValue.includes(term.toLowerCase())
    )

    if (matches) {
      matchedSources.push(source)
    }
  }

  return matchedSources.filter(
    (source, index, collection) =>
      collection.findIndex(
        (entry) =>
          normalizeSignalValue(entry.value) === normalizeSignalValue(source.value) &&
          entry.label === source.label
      ) === index
  )
}

function parseSpecificationsValue(value: unknown) {
  if (value == null) {
    return { value: [] as SpecificationEntry[], error: null }
  }

  if (!Array.isArray(value)) {
    return {
      value: [] as SpecificationEntry[],
      error: "Specifications must be a JSON array.",
    }
  }

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return {
        value: [] as SpecificationEntry[],
        error: "Each specification must be an object with a label and value(s).",
      }
    }

    const record = entry as SpecificationEntry

    if (record.group != null && (typeof record.group !== "string" || !record.group.trim())) {
      return {
        value: [] as SpecificationEntry[],
        error: "Specification groups must be non-empty strings when provided.",
      }
    }

    if (typeof record.label !== "string" || !record.label.trim()) {
      return {
        value: [] as SpecificationEntry[],
        error: "Each specification needs a non-empty string label.",
      }
    }

    const hasStringValue = typeof record.value === "string" && !!record.value.trim()
    const hasStringArray =
      Array.isArray(record.values) &&
      record.values.some((value) => typeof value === "string" && !!value.trim())
    const hasOptionLink = typeof record.option === "string" && !!record.option.trim()

    if (!hasStringValue && !hasStringArray && !hasOptionLink) {
      return {
        value: [] as SpecificationEntry[],
        error: "Each specification needs `value`, `values`, or `option`.",
      }
    }
  }

  return {
    value: value as SpecificationEntry[],
    error: null,
  }
}

function parseTemplateDefaults(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseVariantCombinationDefaultsByType(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as VariantCombinationDefaultsByType
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    VariantCombinationDefaultsByType
  >((acc, [type, entryValue]) => {
    const normalizedType = type.trim()

    if (!normalizedType) {
      return acc
    }

    const parsed = parseVariantCombinationsValue(entryValue)

    if (parsed.value.length) {
      acc[normalizedType] = parsed.value
    }

    return acc
  }, {})
}

function parseVariantCombinationsValue(value: unknown) {
  if (value == null) {
    return { value: [] as VariantCombinationEntry[], error: null }
  }

  if (!Array.isArray(value)) {
    return {
      value: [] as VariantCombinationEntry[],
      error: "Variant combinations must be a JSON array.",
    }
  }

  const normalized: VariantCombinationEntry[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each variant combination must be an object.",
      }
    }

    const record = entry as Record<string, unknown>
    const title = typeof record.title === "string" ? record.title.trim() : ""
    const summary = typeof record.summary === "string" ? record.summary.trim() : ""
    const badge = typeof record.badge === "string" ? record.badge.trim() : ""
    const rawOptionValues = record.option_values

    if (!title) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each variant combination needs a title.",
      }
    }

    if (!rawOptionValues || typeof rawOptionValues !== "object" || Array.isArray(rawOptionValues)) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Variant combinations need an option_values object.",
      }
    }

    const optionValues = Object.entries(rawOptionValues).reduce<Record<string, string>>(
      (acc, [key, currentValue]) => {
        if (typeof currentValue !== "string") {
          return acc
        }

        const normalizedKey = key.trim()
        const normalizedValue = currentValue.trim()

        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue
        }

        return acc
      },
      {}
    )

    if (!Object.keys(optionValues).length) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each variant combination needs at least one option value.",
      }
    }

    normalized.push({
      title,
      ...(summary ? { summary } : {}),
      ...(badge ? { badge } : {}),
      ...(record.is_default === true ? { is_default: true } : {}),
      option_values: optionValues,
    })
  }

  let didAssignDefault = false

  return {
    value: normalized.map((entry) => {
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
    }),
    error: null,
  }
}

function createDraft(entry?: SpecificationEntry): SpecificationDraft {
  const mode = entry?.option
    ? "option"
    : entry?.values?.length
    ? "multiple"
    : "single"

  return {
    id: nextSpecificationDraftId(),
    group: entry?.group ?? "",
    label: entry?.label ?? "",
    mode,
    value: entry?.value ?? (entry?.values?.length === 1 ? entry.values[0] : ""),
    valuesText: entry?.values?.length ? entry.values.join(", ") : "",
    option: entry?.option ?? "",
  }
}

function createVariantCombinationDraft(
  optionTitles: string[],
  entry?: VariantCombinationEntry
) {
  const baseOptionValues = optionTitles.reduce<Record<string, string>>((acc, title) => {
    acc[title] = entry?.option_values?.[title] ?? ""
    return acc
  }, {})

  if (entry?.option_values) {
    for (const [title, value] of Object.entries(entry.option_values)) {
      if (!(title in baseOptionValues)) {
        baseOptionValues[title] = value
      }
    }
  }

  return {
    id: nextVariantCombinationDraftId(),
    title: entry?.title ?? "",
    summary: entry?.summary ?? "",
    badge: entry?.badge ?? "",
    isDefault: entry?.is_default === true,
    optionValues: baseOptionValues,
  }
}

function normalizeSpecificationDrafts(drafts: SpecificationDraft[]) {
  const normalized: SpecificationEntry[] = []

  for (const draft of drafts) {
    const group = draft.group.trim()
    const label = draft.label.trim()

    if (
      !group &&
      !label &&
      !draft.value.trim() &&
      !draft.valuesText.trim() &&
      !draft.option.trim()
    ) {
      continue
    }

    if (!label) {
      return {
        value: [] as SpecificationEntry[],
        error: "Each specification needs a label.",
      }
    }

    if (draft.mode === "option") {
      const option = draft.option.trim()

      if (!option) {
        return {
          value: [] as SpecificationEntry[],
          error: "Linked specifications need an option title.",
        }
      }

      normalized.push({ group: group || undefined, label, option })
      continue
    }

    if (draft.mode === "multiple") {
      const values = draft.valuesText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)

      if (!values.length) {
        return {
          value: [] as SpecificationEntry[],
          error: "Multi-value specifications need at least one value.",
        }
      }

      normalized.push({ group: group || undefined, label, values })
      continue
    }

    const value = draft.value.trim()

    if (!value) {
      return {
        value: [] as SpecificationEntry[],
        error: "Single-value specifications need a value.",
      }
    }

    normalized.push({ group: group || undefined, label, value })
  }

  return {
    value: normalized,
    error: null,
  }
}

function normalizeVariantCombinationDrafts(drafts: VariantCombinationDraft[]) {
  const normalized: VariantCombinationEntry[] = []
  let didAssignDefault = false

  for (const draft of drafts) {
    const title = draft.title.trim()
    const summary = draft.summary.trim()
    const badge = draft.badge.trim()
    const optionValues = Object.entries(draft.optionValues).reduce<Record<string, string>>(
      (acc, [optionTitle, value]) => {
        const normalizedTitle = optionTitle.trim()
        const normalizedValue = value.trim()

        if (normalizedTitle && normalizedValue) {
          acc[normalizedTitle] = normalizedValue
        }

        return acc
      },
      {}
    )

    if (!title && !summary && !badge && !Object.keys(optionValues).length) {
      continue
    }

    if (!title) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each variant combination needs a title.",
      }
    }

    if (!Object.keys(optionValues).length) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each variant combination needs at least one option value.",
      }
    }

    const isDefault = draft.isDefault && !didAssignDefault

    if (isDefault) {
      didAssignDefault = true
    }

    normalized.push({
      title,
      ...(summary ? { summary } : {}),
      ...(badge ? { badge } : {}),
      ...(isDefault ? { is_default: true } : {}),
      option_values: optionValues,
    })
  }

  return { value: normalized, error: null }
}

function normalizeOptionValuesMap(values: Record<string, string>) {
  return Object.entries(values).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedKey = key.trim()
    const normalizedValue = value.trim()

    if (normalizedKey && normalizedValue) {
      acc[normalizedKey] = normalizedValue
    }

    return acc
  }, {})
}

function getVariantCombinationLookupKey(optionValues: Record<string, string>) {
  return Object.entries(normalizeOptionValuesMap(optionValues))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}:${value}`)
    .join("|")
}

function extractExistingVariantCombinationMap(drafts: VariantCombinationDraft[]) {
  return drafts.reduce<Map<string, VariantCombinationDraft>>((acc, draft) => {
    const optionValues = normalizeOptionValuesMap(draft.optionValues)
    const key = getVariantCombinationLookupKey(optionValues)

    if (key) {
      acc.set(key, draft)
    }

    return acc
  }, new Map())
}

function extractVariantOptionValues(
  variant: AdminVariantSnapshot,
  productOptionTitles: string[]
) {
  return (variant.options ?? []).reduce<Record<string, string>>((acc, option, index) => {
    const optionTitle =
      option.option?.title?.trim() ||
      option.option_title?.trim() ||
      option.title?.trim() ||
      productOptionTitles[index]

    const value = option.value?.trim()

    if (optionTitle && value) {
      acc[optionTitle] = value
    }

    return acc
  }, {})
}

function buildVariantCombinationEntriesFromVariants(
  variants: AdminVariantSnapshot[],
  productOptionTitles: string[],
  existingDrafts: VariantCombinationDraft[]
) {
  const existingDraftsMap = extractExistingVariantCombinationMap(existingDrafts)

  return variants
    .map((variant) => {
      const optionValues = extractVariantOptionValues(variant, productOptionTitles)
      const key = getVariantCombinationLookupKey(optionValues)

      if (!key) {
        return null
      }

      const existingDraft = existingDraftsMap.get(key)
      const titleFromOptions = Object.entries(optionValues)
        .map(([optionTitle, value]) => `${optionTitle}: ${value}`)
        .join(" / ")

      const summary =
        existingDraft?.summary.trim() ||
        (variant.sku?.trim() ? `SKU: ${variant.sku.trim()}` : undefined)
      const badge = existingDraft?.badge.trim() || undefined
      const isDefault = existingDraft?.isDefault === true

      const entry: VariantCombinationEntry = {
        title:
          existingDraft?.title.trim() ||
          variant.title?.trim() ||
          titleFromOptions ||
          "Variant combination",
        ...(summary ? { summary } : {}),
        ...(badge ? { badge } : {}),
        ...(isDefault ? { is_default: true } : {}),
        option_values: optionValues,
      }

      return entry
    })
    .filter((entry): entry is VariantCombinationEntry => entry !== null)
}

function normalizeProductImages(value: ProductWidgetProps["data"]["images"]) {
  if (!Array.isArray(value)) {
    return [] as ProductImageDraft[]
  }

  return value
    .map((image) => ({
      id: typeof image?.id === "string" ? image.id : undefined,
      url: typeof image?.url === "string" ? image.url.trim() : "",
      rank: typeof image?.rank === "number" ? image.rank : Number.MAX_SAFE_INTEGER,
    }))
    .filter((image) => !!image.url)
    .sort((a, b) => a.rank - b.rank)
    .map(({ id, url }) => ({ id, url }))
}

const STORE_METADATA_CACHE_TTL_MS = 250

let storeMetadataCache: Record<string, unknown> | null = null
let storeMetadataCacheExpiresAt = 0
let storeMetadataRequest: Promise<Record<string, unknown> | null> | null = null

function loadStoreMetadata() {
  if (storeMetadataCache && storeMetadataCacheExpiresAt > Date.now()) {
    return Promise.resolve(storeMetadataCache)
  }

  if (!storeMetadataRequest) {
    storeMetadataRequest = fetch("/admin/stores", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          return null
        }

        const json = (await res.json().catch(() => null)) as
          | { store?: { metadata?: unknown }; stores?: Array<{ metadata?: unknown }> }
          | null

        const store = Array.isArray(json?.stores) ? json?.stores[0] : json?.store

        if (!store?.metadata || typeof store.metadata !== "object" || Array.isArray(store.metadata)) {
          storeMetadataCache = {}
          storeMetadataCacheExpiresAt = Date.now() + STORE_METADATA_CACHE_TTL_MS
          return {}
        }

        storeMetadataCache = store.metadata as Record<string, unknown>
        storeMetadataCacheExpiresAt = Date.now() + STORE_METADATA_CACHE_TTL_MS

        return storeMetadataCache
      })
      .catch(() => null)
      .finally(() => {
        storeMetadataRequest = null
      })
  }

  return storeMetadataRequest
}

function ProductMetadataWidget({ data }: ProductWidgetProps) {
  const [badge, setBadge] = useState("")
  const [emoji, setEmoji] = useState("")
  const [heroChip, setHeroChip] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [productImages, setProductImages] = useState<ProductImageDraft[]>([])
  const [stockMode, setStockMode] = useState("track_visible")
  const [templateDefaults, setTemplateDefaults] = useState<string[]>([])
  // Template IDs inherited from the global per-type config (store metadata)
  const [globalInheritedDefaults, setGlobalInheritedDefaults] = useState<string[]>([])
  const [globalVariantCombinationDefaults, setGlobalVariantCombinationDefaults] = useState<
    VariantCombinationEntry[]
  >([])
  const [specificationDrafts, setSpecificationDrafts] = useState<SpecificationDraft[]>([])
  const [specificationsError, setSpecificationsError] = useState<string | null>(null)
  const [variantCombinationDrafts, setVariantCombinationDrafts] = useState<VariantCombinationDraft[]>([])
  const [variantCombinationsError, setVariantCombinationsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncingVariantCombinations, setSyncingVariantCombinations] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const productOptionTitles = useMemo(
    () =>
      Array.from(
        new Set(
          (data.options ?? [])
            .map((option) => option.title?.trim())
            .filter((title): title is string => !!title)
        )
      ),
    [data.options]
  )

  const savedVariantCombinations = useMemo(
    () => parseVariantCombinationsValue((data.metadata ?? {}).variant_combinations),
    [data.metadata?.variant_combinations]
  )

  const productSignalSources = getProductSignalSources(data)

  // Merge per-product saved defaults + global inherited defaults for ordering
  const allDefaultIds = Array.from(new Set([...templateDefaults, ...globalInheritedDefaults]))

  const defaultTemplates = SPECIFICATION_TEMPLATES.filter((template) =>
    allDefaultIds.includes(template.id)
  )

  const contextTemplateMatches = SPECIFICATION_TEMPLATES.map((template) => ({
    template,
    matches: findTemplateSignalMatches(template, productSignalSources),
  }))

  const contextTemplates = contextTemplateMatches
    .filter((entry) => entry.matches.length > 0)
    .map((entry) => entry.template)

  const recommendationReasons = new Map(
    contextTemplateMatches
      .filter((entry) => entry.matches.length > 0)
      .map((entry) => [
        entry.template.id,
        entry.matches
          .map((match) => `${match.label}: ${match.value}`)
          .slice(0, 3),
      ])
  )

  const recommendedTemplates = [...defaultTemplates, ...contextTemplates].filter(
    (template, index, collection) =>
      collection.findIndex((entry) => entry.id === template.id) === index
  )

  const fallbackTemplates = SPECIFICATION_TEMPLATES.filter(
    (template) => !recommendedTemplates.some((recommended) => recommended.id === template.id)
  )

  useEffect(() => {
    const meta = (data?.metadata ?? {}) as Record<string, unknown>
    setBadge(typeof meta.badge === "string" ? meta.badge : "")
    setEmoji(typeof meta.emoji === "string" ? meta.emoji : "")
    setHeroChip(typeof meta.hero_chip === "string" ? meta.hero_chip : "")
    setVideoUrl(typeof meta.video_url === "string" ? meta.video_url : "")
    setProductImages(normalizeProductImages(data.images))
    setStockMode(
      typeof meta.stock_mode === "string" ? meta.stock_mode : "track_visible"
    )
    setTemplateDefaults(parseTemplateDefaults(meta.specification_template_defaults))
    const parsedSpecifications = parseSpecificationsValue(meta.specifications)
    setSpecificationDrafts(
      parsedSpecifications.value.map((entry) => createDraft(entry))
    )
    setSpecificationsError(parsedSpecifications.error)
    setVariantCombinationDrafts(
      savedVariantCombinations.value.map((entry) =>
        createVariantCombinationDraft(productOptionTitles, entry)
      )
    )
    setVariantCombinationsError(savedVariantCombinations.error)
  }, [data, productOptionTitles, savedVariantCombinations])

  // Load global per-type template defaults from store metadata
  useEffect(() => {
    const productTypeValue = data.type?.value
    if (!productTypeValue) {
      setGlobalInheritedDefaults([])
      setGlobalVariantCombinationDefaults([])
      return
    }

    loadStoreMetadata()
      .then((byType) => {
        if (!byType) {
          return
        }

        const map = byType.specification_template_defaults_by_type
        if (map && typeof map === "object" && !Array.isArray(map)) {
          const ids = (map as Record<string, unknown>)[productTypeValue]
          if (Array.isArray(ids)) {
            setGlobalInheritedDefaults(
              ids.filter((id): id is string => typeof id === "string")
            )
          } else {
            setGlobalInheritedDefaults([])
          }
        } else {
          setGlobalInheritedDefaults([])
        }

        const presetDefaultsMap = parseVariantCombinationDefaultsByType(
          byType.variant_combination_defaults_by_type
        )
        const inheritedVariantCombinations = presetDefaultsMap[productTypeValue] ?? []

        setGlobalVariantCombinationDefaults(inheritedVariantCombinations)

        if (
          !savedVariantCombinations.value.length &&
          !variantCombinationDrafts.length &&
          inheritedVariantCombinations.length
        ) {
          setVariantCombinationDrafts(
            inheritedVariantCombinations.map((entry) =>
              createVariantCombinationDraft(productOptionTitles, entry)
            )
          )
        }
      })
      .catch(() => {})
  }, [data.type?.value, productOptionTitles, savedVariantCombinations.value.length])

  const loadGlobalVariantCombinationDefaults = () => {
    if (!globalVariantCombinationDefaults.length) {
      return
    }

    setVariantCombinationDrafts(
      globalVariantCombinationDefaults.map((entry) =>
        createVariantCombinationDraft(productOptionTitles, entry)
      )
    )
    setVariantCombinationsError(null)
  }

  const addSpecificationDraft = () => {
    setSpecificationDrafts((current) => [...current, createDraft()])
    if (specificationsError) {
      setSpecificationsError(null)
    }
  }

  const addSpecificationTemplate = (templateId: string) => {
    const template = SPECIFICATION_TEMPLATES.find((entry) => entry.id === templateId)

    if (!template) {
      return
    }

    setSpecificationDrafts((current) => [
      ...current,
      ...template.entries.map((entry) => createDraft(entry)),
    ])

    if (specificationsError) {
      setSpecificationsError(null)
    }
  }

  const updateSpecificationDraft = (
    id: string,
    patch: Partial<SpecificationDraft>
  ) => {
    setSpecificationDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    )

    if (specificationsError) {
      setSpecificationsError(null)
    }
  }

  const removeSpecificationDraft = (id: string) => {
    setSpecificationDrafts((current) => current.filter((draft) => draft.id !== id))

    if (specificationsError) {
      setSpecificationsError(null)
    }
  }

  const addVariantCombinationDraft = () => {
    setVariantCombinationDrafts((current) => [
      ...current,
      createVariantCombinationDraft(productOptionTitles),
    ])

    if (variantCombinationsError) {
      setVariantCombinationsError(null)
    }
  }

  const updateVariantCombinationDraft = (
    id: string,
    patch: Partial<VariantCombinationDraft>
  ) => {
    setVariantCombinationDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    )

    if (variantCombinationsError) {
      setVariantCombinationsError(null)
    }
  }

  const setDefaultVariantCombinationDraft = (id: string) => {
    setVariantCombinationDrafts((current) => {
      const targetDraft = current.find((draft) => draft.id === id)
      const clearDefault = targetDraft?.isDefault === true

      return current.map((draft) => ({
        ...draft,
        isDefault: clearDefault ? false : draft.id === id,
      }))
    })

    if (variantCombinationsError) {
      setVariantCombinationsError(null)
    }
  }

  const updateVariantCombinationOptionValue = (
    id: string,
    optionTitle: string,
    value: string
  ) => {
    setVariantCombinationDrafts((current) =>
      current.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              optionValues: {
                ...draft.optionValues,
                [optionTitle]: value,
              },
            }
          : draft
      )
    )

    if (variantCombinationsError) {
      setVariantCombinationsError(null)
    }
  }

  const removeVariantCombinationDraft = (id: string) => {
    setVariantCombinationDrafts((current) =>
      current.filter((draft) => draft.id !== id)
    )

    if (variantCombinationsError) {
      setVariantCombinationsError(null)
    }
  }

  const syncVariantCombinationsFromVariants = async () => {
    if (!productOptionTitles.length) {
      showToast("err", "Add product options before syncing variant combinations.")
      return
    }

    setSyncingVariantCombinations(true)

    try {
      const res = await fetch(`/admin/products/${data.id}`, {
        credentials: "include",
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message ?? "Failed to load variants")
      }

      const json = (await res.json()) as {
        product?: {
          variants?: AdminVariantSnapshot[]
        }
      }

      const variants = Array.isArray(json.product?.variants)
        ? json.product?.variants ?? []
        : []

      const syncedEntries = buildVariantCombinationEntriesFromVariants(
        variants,
        productOptionTitles,
        variantCombinationDrafts
      )

      if (!syncedEntries.length) {
        throw new Error(
          "No real variants with option values were found for this product."
        )
      }

      setVariantCombinationDrafts(
        syncedEntries.map((entry) =>
          createVariantCombinationDraft(productOptionTitles, entry)
        )
      )
      setVariantCombinationsError(null)
      showToast(
        "ok",
        syncedEntries.length === 1
          ? "Synced 1 variant combination"
          : `Synced ${syncedEntries.length} variant combinations`
      )
    } catch (error) {
      showToast(
        "err",
        error instanceof Error ? error.message : "Variant sync failed"
      )
    } finally {
      setSyncingVariantCombinations(false)
    }
  }

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUploadImages = async (files: FileList | null) => {
    if (!files?.length) {
      return
    }

    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append("files", file)
    })

    setUploadingImages(true)
    try {
      const res = await fetch("/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message ?? "Upload failed")
      }

      const json = (await res.json()) as {
        files?: Array<{ id?: string; url?: string }>
      }

      const uploaded = (json.files ?? [])
        .map((file) => ({
          id: typeof file.id === "string" ? file.id : undefined,
          url: typeof file.url === "string" ? file.url.trim() : "",
        }))
        .filter((file) => !!file.url)

      if (!uploaded.length) {
        throw new Error("No uploaded file URLs returned")
      }

      setProductImages((current) => [...current, ...uploaded])
      showToast("ok", uploaded.length === 1 ? "Image uploaded" : "Images uploaded")
    } catch (error) {
      showToast(
        "err",
        error instanceof Error ? error.message : "Upload failed"
      )
    } finally {
      setUploadingImages(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeProductImage = (index: number) => {
    setProductImages((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const toggleTemplateDefault = (templateId: string) => {
    setTemplateDefaults((current) =>
      current.includes(templateId)
        ? current.filter((entry) => entry !== templateId)
        : [...current, templateId]
    )
  }

  const handleSave = async () => {
    const parsedSpecifications = normalizeSpecificationDrafts(specificationDrafts)

    if (parsedSpecifications.error) {
      setSpecificationsError(parsedSpecifications.error)
      showToast("err", parsedSpecifications.error)
      return
    }

    const parsedVariantCombinations = normalizeVariantCombinationDrafts(
      variantCombinationDrafts
    )

    if (parsedVariantCombinations.error) {
      setVariantCombinationsError(parsedVariantCombinations.error)
      showToast("err", parsedVariantCombinations.error)
      return
    }

    setSpecificationsError(null)
    setVariantCombinationsError(null)
    setSaving(true)
    const existing = (data?.metadata ?? {}) as Record<string, unknown>
    const updated: Record<string, unknown> = { ...existing }

    if (badge) updated.badge = badge
    else delete updated.badge

    if (emoji) updated.emoji = emoji
    else delete updated.emoji

    if (heroChip) updated.hero_chip = heroChip
    else delete updated.hero_chip

    if (videoUrl.trim()) updated.video_url = videoUrl.trim()
    else delete updated.video_url

    updated.stock_mode = stockMode

    if (templateDefaults.length) {
      updated.specification_template_defaults = templateDefaults
    } else {
      delete updated.specification_template_defaults
    }

    if (parsedSpecifications.value.length) updated.specifications = parsedSpecifications.value
    else delete updated.specifications

    if (parsedVariantCombinations.value.length) {
      updated.variant_combinations = parsedVariantCombinations.value
    } else {
      delete updated.variant_combinations
    }

    try {
      const res = await fetch(`/admin/products/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: updated,
          images: productImages.map((image) =>
            image.id ? { id: image.id, url: image.url } : { url: image.url }
          ),
        }),
      })
      if (res.ok) {
        showToast("ok", "Metadata saved!")
      } else {
        const json = await res.json().catch(() => ({}))
        showToast("err", (json as { message?: string }).message ?? "Save failed")
      }
    } catch {
      showToast("err", "Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>NEXMART Metadata</h2>

      <div style={gridStyle}>
        {/* Badge */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Badge type</label>
          <select
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            style={inputStyle}
          >
            {BADGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Emoji */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Emoji icon</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="e.g. 💻"
            maxLength={8}
            style={inputStyle}
          />
        </div>

        {/* Hero chip */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Hero chip text</label>
          <input
            type="text"
            value={heroChip}
            onChange={(e) => setHeroChip(e.target.value)}
            placeholder="e.g. Staff Pick"
            maxLength={32}
            style={inputStyle}
          />
        </div>

        {/* Video URL */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Product video URL</label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube, Vimeo, or direct .mp4 URL"
            style={inputStyle}
          />
        </div>

        <div style={textAreaFieldStyle}>
          <div style={specificationsHeaderStyle}>
            <label style={labelStyle}>Product media</label>
            <div style={specificationsActionsStyle}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleUploadImages(e.target.files)}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={secondaryButtonStyle}
                disabled={uploadingImages}
              >
                {uploadingImages ? "Uploading…" : "Upload images"}
              </button>
            </div>
          </div>

          {productImages.length ? (
            <div style={mediaGridStyle}>
              {productImages.map((image, index) => (
                <div key={`${image.id ?? image.url}-${index}`} style={mediaCardStyle}>
                  <img
                    src={image.url}
                    alt={`Product image ${index + 1}`}
                    style={mediaPreviewStyle}
                  />
                  <div style={mediaCardFooterStyle}>
                    <span style={mediaUrlStyle}>{image.url}</span>
                    <button
                      type="button"
                      onClick={() => removeProductImage(index)}
                      style={dangerButtonStyle}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>
              No product images attached yet. Upload one or more images, then save metadata to persist them on the product.
            </div>
          )}
          <span style={subtleTextStyle}>
            Uploads go through Medusa&apos;s file module to MinIO, then the saved URLs are attached to <code>product.images</code>.
          </span>
        </div>

        {/* Stock mode */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Stock mode</label>
          <select
            value={stockMode}
            onChange={(e) => setStockMode(e.target.value)}
            style={inputStyle}
          >
            {STOCK_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div style={textAreaFieldStyle}>
          <div style={specificationsHeaderStyle}>
            <label style={labelStyle}>Variant combinations</label>
            <div style={specificationsActionsStyle}>
              {globalVariantCombinationDefaults.length ? (
                <button
                  type="button"
                  onClick={loadGlobalVariantCombinationDefaults}
                  style={secondaryButtonStyle}
                  disabled={!productOptionTitles.length}
                >
                  Load global defaults
                </button>
              ) : null}
              <button
                type="button"
                onClick={syncVariantCombinationsFromVariants}
                style={secondaryButtonStyle}
                disabled={!productOptionTitles.length || syncingVariantCombinations}
              >
                {syncingVariantCombinations ? "Syncing…" : "Sync from variants"}
              </button>
              <button
                type="button"
                onClick={addVariantCombinationDraft}
                style={secondaryButtonStyle}
                disabled={!productOptionTitles.length}
              >
                Add combination
              </button>
            </div>
          </div>
          {productOptionTitles.length ? (
            <>
              <div style={specificationsListStyle}>
                {variantCombinationDrafts.length ? (
                  variantCombinationDrafts.map((draft) => (
                    <div key={draft.id} style={specificationCardStyle}>
                      <div style={specificationCardHeaderStyle}>
                        <span style={specificationCardTitleStyle}>Combination</span>
                        <button
                          type="button"
                          onClick={() => removeVariantCombinationDraft(draft.id)}
                          style={dangerButtonStyle}
                        >
                          Remove
                        </button>
                      </div>

                      <div style={specificationGridStyle}>
                        <div style={fieldStyle}>
                          <label style={labelStyle}>Title</label>
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(e) =>
                              updateVariantCombinationDraft(draft.id, {
                                title: e.target.value,
                              })
                            }
                            placeholder="e.g. Everyday setup"
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldStyle}>
                          <label style={labelStyle}>Badge</label>
                          <input
                            type="text"
                            value={draft.badge}
                            onChange={(e) =>
                              updateVariantCombinationDraft(draft.id, {
                                badge: e.target.value,
                              })
                            }
                            placeholder="e.g. Best value"
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldStyle}>
                          <label style={labelStyle}>Default preset</label>
                          <label style={checkboxRowStyle}>
                            <input
                              type="checkbox"
                              checked={draft.isDefault}
                              onChange={() => setDefaultVariantCombinationDraft(draft.id)}
                            />
                            <span style={subtleTextStyle}>
                              Use this setup when the PDP opens without a selected variant (toggle off to clear).
                            </span>
                          </label>
                        </div>

                        <div style={wideFieldStyle}>
                          <label style={labelStyle}>Summary</label>
                          <input
                            type="text"
                            value={draft.summary}
                            onChange={(e) =>
                              updateVariantCombinationDraft(draft.id, {
                                summary: e.target.value,
                              })
                            }
                            placeholder="Short note for merchandised combination guidance"
                            style={inputStyle}
                          />
                        </div>

                        {productOptionTitles.map((optionTitle) => (
                          <div key={`${draft.id}-${optionTitle}`} style={fieldStyle}>
                            <label style={labelStyle}>{optionTitle}</label>
                            <input
                              type="text"
                              value={draft.optionValues[optionTitle] ?? ""}
                              onChange={(e) =>
                                updateVariantCombinationOptionValue(
                                  draft.id,
                                  optionTitle,
                                  e.target.value
                                )
                              }
                              placeholder={`Value for ${optionTitle}`}
                              style={inputStyle}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={emptyStateStyle}>
                    No explicit variant combinations yet. Add merchandised combinations like a preferred Color + Size pairing or starter configuration.
                  </div>
                )}
              </div>
              <span style={subtleTextStyle}>
                Saved as <code>metadata.variant_combinations</code>. These combinations help with admin authoring and merchandising guidance; they do not create real Medusa variants.
              </span>
              {globalVariantCombinationDefaults.length ? (
                <span style={subtleTextStyle}>
                  <strong>Global defaults available:</strong> this product type has store-level preset defaults saved in the Preset Defaults admin page. Use <strong>Load global defaults</strong> to copy them into this product before saving a per-product override.
                </span>
              ) : null}
              <span style={subtleTextStyle}>
                Mark one combination as the default preset to prefill the PDP on first load when no variant is explicitly selected.
              </span>
              <span style={subtleTextStyle}>
                If no combination is marked as default, the PDP falls back to the first valid setup as the recommended starting point.
              </span>
              <span style={subtleTextStyle}>
                Use <strong>Sync from variants</strong> to regenerate combinations from the product&apos;s current real variant rows while preserving existing titles, badges, and summaries when the same option-value pairing still exists.
              </span>
            </>
          ) : (
            <div style={emptyStateStyle}>
              This product has no option titles yet. Add product options first, then define explicit variant combinations here.
            </div>
          )}
          {variantCombinationsError ? (
            <span style={errorTextStyle}>{variantCombinationsError}</span>
          ) : null}
        </div>

        <div style={textAreaFieldStyle}>
          <div style={specificationsHeaderStyle}>
            <label style={labelStyle}>Specifications</label>
            <div style={specificationsActionsStyle}>
              <button
                type="button"
                onClick={addSpecificationDraft}
                style={secondaryButtonStyle}
              >
                Add row
              </button>
            </div>
          </div>
          <div style={templateSectionStyle}>
            <span style={labelStyle}>Reusable templates</span>
            <div style={templateGroupStyle}>
              <span style={templateGroupTitleStyle}>Saved defaults</span>
              <div style={defaultToggleListStyle}>
                {SPECIFICATION_TEMPLATES.map((template) => {
                  const selected = templateDefaults.includes(template.id)
                  const inherited = globalInheritedDefaults.includes(template.id)

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => toggleTemplateDefault(template.id)}
                      style={{
                        ...defaultToggleStyle,
                        ...(selected ? selectedDefaultToggleStyle : {}),
                        ...(inherited && !selected ? inheritedToggleStyle : {}),
                      }}
                      title={inherited && !selected ? "Inherited from global type defaults" : undefined}
                    >
                      {selected ? "Default: " : inherited ? "↓ Global: " : ""}
                      {template.label}
                    </button>
                  )
                })}
              </div>
              <span style={subtleTextStyle}>
                Saved defaults are persisted in product metadata and shown first in template recommendations.
                {globalInheritedDefaults.length > 0 && (
                  <> <strong>↓ Global</strong> = inherited from the product type via the Spec Defaults admin page.</>
                )}
              </span>
            </div>
            {recommendedTemplates.length ? (
              <div style={templateGroupStyle}>
                <span style={templateGroupTitleStyle}>Recommended for this product</span>
                <div style={templateListStyle}>
                  {recommendedTemplates.map((template) => (
                    <div key={template.id} style={templateCardStyle}>
                      <div style={templateCardTextStyle}>
                        <span style={templateCardTitleStyle}>{template.label}</span>
                        <span style={subtleTextStyle}>{template.description}</span>
                        {recommendationReasons.get(template.id)?.length ? (
                          <span style={subtleTextStyle}>
                            Matched from {recommendationReasons.get(template.id)?.join(", ")}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => addSpecificationTemplate(template.id)}
                        style={secondaryButtonStyle}
                      >
                        Insert
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div style={templateGroupStyle}>
              <span style={templateGroupTitleStyle}>
                {recommendedTemplates.length ? "All templates" : "Available templates"}
              </span>
              <div style={templateListStyle}>
                {(recommendedTemplates.length ? fallbackTemplates : SPECIFICATION_TEMPLATES).map((template) => (
                <div key={template.id} style={templateCardStyle}>
                  <div style={templateCardTextStyle}>
                    <span style={templateCardTitleStyle}>{template.label}</span>
                    <span style={subtleTextStyle}>{template.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addSpecificationTemplate(template.id)}
                    style={secondaryButtonStyle}
                  >
                    Insert
                  </button>
                </div>
                ))}
              </div>
            </div>
          </div>
          <div style={specificationsListStyle}>
            {specificationDrafts.length ? (
              specificationDrafts.map((draft) => (
                <div key={draft.id} style={specificationCardStyle}>
                  <div style={specificationCardHeaderStyle}>
                    <span style={specificationCardTitleStyle}>Specification row</span>
                    <button
                      type="button"
                      onClick={() => removeSpecificationDraft(draft.id)}
                      style={dangerButtonStyle}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={specificationGridStyle}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Group</label>
                      <input
                        type="text"
                        value={draft.group}
                        onChange={(e) =>
                          updateSpecificationDraft(draft.id, { group: e.target.value })
                        }
                        placeholder="e.g. Display"
                        style={inputStyle}
                      />
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Label</label>
                      <input
                        type="text"
                        value={draft.label}
                        onChange={(e) =>
                          updateSpecificationDraft(draft.id, { label: e.target.value })
                        }
                        placeholder="e.g. RAM"
                        style={inputStyle}
                      />
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Type</label>
                      <select
                        value={draft.mode}
                        onChange={(e) => {
                          const mode = e.target.value as SpecificationDraft["mode"]
                          updateSpecificationDraft(draft.id, {
                            mode,
                            value: mode === "single" ? draft.value : "",
                            valuesText: mode === "multiple" ? draft.valuesText : "",
                            option: mode === "option" ? draft.option : "",
                          })
                        }}
                        style={inputStyle}
                      >
                        <option value="single">Single value</option>
                        <option value="multiple">Multiple values</option>
                        <option value="option">Linked option</option>
                      </select>
                    </div>

                    {draft.mode === "single" ? (
                      <div style={wideFieldStyle}>
                        <label style={labelStyle}>Value</label>
                        <input
                          type="text"
                          value={draft.value}
                          onChange={(e) =>
                            updateSpecificationDraft(draft.id, { value: e.target.value })
                          }
                          placeholder="e.g. 8GB"
                          style={inputStyle}
                        />
                      </div>
                    ) : null}

                    {draft.mode === "multiple" ? (
                      <div style={wideFieldStyle}>
                        <label style={labelStyle}>Values</label>
                        <input
                          type="text"
                          value={draft.valuesText}
                          onChange={(e) =>
                            updateSpecificationDraft(draft.id, { valuesText: e.target.value })
                          }
                          placeholder="e.g. Black, Blue, Silver"
                          style={inputStyle}
                        />
                        <span style={subtleTextStyle}>Separate multiple values with commas.</span>
                      </div>
                    ) : null}

                    {draft.mode === "option" ? (
                      <div style={wideFieldStyle}>
                        <label style={labelStyle}>Option title</label>
                        {productOptionTitles.length ? (
                          <select
                            value={draft.option}
                            onChange={(e) =>
                              updateSpecificationDraft(draft.id, { option: e.target.value })
                            }
                            style={inputStyle}
                          >
                            <option value="">Select a product option</option>
                            {productOptionTitles.map((title) => (
                              <option key={title} value={title}>
                                {title}
                              </option>
                            ))}
                            {draft.option && !productOptionTitles.includes(draft.option) ? (
                              <option value={draft.option}>{draft.option}</option>
                            ) : null}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={draft.option}
                            onChange={(e) =>
                              updateSpecificationDraft(draft.id, { option: e.target.value })
                            }
                            placeholder="e.g. Color"
                            style={inputStyle}
                          />
                        )}
                        <span style={subtleTextStyle}>
                          {productOptionTitles.length
                            ? "Choose an existing Medusa option so the PDP shows the selected variant value."
                            : "Match an existing Medusa option title so the PDP shows the selected variant value."}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div style={emptyStateStyle}>
                No specification rows yet. Add grouped static values or link a row to an option like Color or Size.
              </div>
            )}
          </div>
          <span style={subtleTextStyle}>
            Rows are still saved into <code>metadata.specifications</code>; templates only prefill grouped rows and do not change the saved format.
          </span>
          <span style={subtleTextStyle}>
            Preferred templates are saved as <code>metadata.specification_template_defaults</code> for this product.
          </span>
          {specificationsError ? (
            <span style={errorTextStyle}>{specificationsError}</span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button onClick={handleSave} disabled={saving} style={buttonStyle}>
          {saving ? "Saving…" : "Save metadata"}
        </button>
        {toast && (
          <span
            style={{ color: toast.type === "ok" ? "#059669" : "#dc2626", fontSize: 13 }}
          >
            {toast.text}
          </span>
        )}
      </div>

      <p style={hintStyle}>
        <strong>badge</strong>: deal / hot / new / top — shown as overlay chip on product card.
        &nbsp;
        <strong>emoji</strong>: displayed beside product name in hero/featured slots.
        &nbsp;
        <strong>hero chip</strong>: small label on hero featured product.
        &nbsp;
        <strong>stock mode</strong>: controls inventory visibility in the storefront.
        &nbsp;
        <strong>variant combinations</strong>: metadata-backed admin authoring for named option-value combinations such as curated Color/Size pairings or recommended configurations.
        &nbsp;
        <strong>specifications</strong>: metadata-backed PDP details shown in the storefront
        Specifications section, including optional groups, reusable admin templates, and entries linked to Medusa option titles like Color or Size.
      </p>
    </div>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
}

const headingStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 16,
  color: "#111827",
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
}

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
}

const textAreaFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  gridColumn: "1 / -1",
}

const wideFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  gridColumn: "1 / -1",
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  background: "#f9fafb",
  color: "#111827",
  outline: "none",
}

const buttonStyle: React.CSSProperties = {
  padding: "7px 18px",
  background: "#111827",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: "7px 12px",
  background: "#f3f4f6",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
}

const dangerButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  background: "#fff1f2",
  color: "#be123c",
  border: "1px solid #fecdd3",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
}

const hintStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 11,
  color: "#9ca3af",
  lineHeight: 1.6,
}

const subtleTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  lineHeight: 1.5,
}

const errorTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#dc2626",
  lineHeight: 1.5,
}

const specificationsHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
}

const specificationsActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
}

const templateSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const templateGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#ffffff",
}

const templateGroupTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#111827",
}

const defaultToggleListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
}

const defaultToggleStyle: React.CSSProperties = {
  padding: "7px 12px",
  background: "#f9fafb",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
}

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 34,
}

const selectedDefaultToggleStyle: React.CSSProperties = {
  background: "#ecfeff",
  color: "#155e75",
  border: "1px solid #67e8f9",
}

// Inherited from global type defaults (not yet pinned per-product)
const inheritedToggleStyle: React.CSSProperties = {
  background: "#fef9c3",
  color: "#713f12",
  border: "1px solid #fde047",
}

const templateListStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
}

const templateCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  background: "#ffffff",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
}

const templateCardTextStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
}

const templateCardTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#111827",
}

const specificationsListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const specificationCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 14,
  background: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const specificationCardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
}

const specificationCardTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#111827",
}

const specificationGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
}

const emptyStateStyle: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 8,
  padding: 14,
  color: "#6b7280",
  fontSize: 12,
  background: "#f9fafb",
}

const mediaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
}

const mediaCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 10,
  background: "#ffffff",
}

const mediaPreviewStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 6,
  background: "#f3f4f6",
}

const mediaCardFooterStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const mediaUrlStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  wordBreak: "break-all",
  lineHeight: 1.5,
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductMetadataWidget
