import { normalizeUiLocale } from "@lib/ui-copy"

type ProductOptionLike = {
  id?: string | null
  title?: unknown
}

type VariantOptionLike = {
  option_id?: string | null
  value?: string | null
}

type ProductLike = {
  options?: ProductOptionLike[] | null
  metadata?: Record<string, unknown> | null
}

type OptionSummaryRow = {
  optionId: string
  label: string
  value: string
  candidates: string[]
}

type SpecificationSummaryRow = {
  label: string
  optionId?: string
  optionReferences: string[]
}

export type WhatsAppSelectionRow = {
  label: string
  value: string
}

type WhatsAppSelectionSummaryInput = {
  product?: ProductLike | null
  variantOptions?: VariantOptionLike[] | null
  locale: string | null | undefined
  variantTitle?: string | null
  presetTitle?: string | null
  setupLabel?: string | null
  includeVariantTitleFallback?: boolean
}

type WhatsAppProductLineInput = WhatsAppSelectionSummaryInput & {
  title: string
  priceText?: string | null
}

type WhatsAppCartLineInput = WhatsAppSelectionSummaryInput & {
  quantity: number
  title: string
}

const normalizeCandidate = (value: string) => value.trim().toLowerCase()

const getTrimmedText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : ""

const getLocalizedText = (
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
  const normalizedLocale = normalizeUiLocale(locale)

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

const getTextCandidates = (value: unknown) => {
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

const parseLinkedSpecificationRows = ({
  metadata,
  locale,
}: {
  metadata?: Record<string, unknown> | null
  locale: string | null | undefined
}) => {
  const rawSpecifications = metadata?.specifications

  if (!Array.isArray(rawSpecifications)) {
    return [] as SpecificationSummaryRow[]
  }

  return rawSpecifications
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const record = entry as Record<string, unknown>
      const label = getLocalizedText(record.label, locale)
      const optionId =
        typeof record.option_id === "string" && record.option_id.trim()
          ? record.option_id.trim()
          : undefined
      const optionReferences = getTextCandidates(record.option)

      if (!label || (!optionId && !optionReferences.length)) {
        return null
      }

      return {
        label,
        optionId,
        optionReferences,
      } satisfies SpecificationSummaryRow
    })
    .filter((entry): entry is SpecificationSummaryRow => entry !== null)
}

export const buildLocalizedWhatsAppSelectionRows = ({
  product,
  variantOptions,
  locale,
}: {
  product?: ProductLike | null
  variantOptions?: VariantOptionLike[] | null
  locale: string | null | undefined
}) => {
  const selectedValuesByOptionId = (variantOptions ?? []).reduce<Record<string, string>>(
    (acc, option) => {
      if (!option?.option_id || typeof option.value !== "string") {
        return acc
      }

      const optionId = option.option_id.trim()
      const optionValue = option.value.trim()

      if (optionId && optionValue) {
        acc[optionId] = optionValue
      }

      return acc
    },
    {}
  )

  if (!product?.options?.length || !Object.keys(selectedValuesByOptionId).length) {
    return [] as WhatsAppSelectionRow[]
  }

  const optionRows = (product.options ?? []).reduce<OptionSummaryRow[]>(
    (acc, option) => {
      const optionId = typeof option.id === "string" ? option.id.trim() : ""

      if (!optionId) {
        return acc
      }

      const value = selectedValuesByOptionId[optionId]

      if (!value) {
        return acc
      }

      const label = getLocalizedText(option.title, locale)
      const candidates = Array.from(
        new Set([label, ...getTextCandidates(option.title)].filter(Boolean))
      )

      acc.push({
        optionId,
        label: label || candidates[0] || optionId,
        value,
        candidates,
      })

      return acc
    },
    []
  )

  if (!optionRows.length) {
    return [] as WhatsAppSelectionRow[]
  }

  const specificationRows = parseLinkedSpecificationRows({
    metadata: product.metadata,
    locale,
  })

  const usedOptionIds = new Set<string>()
  const summaryRows: WhatsAppSelectionRow[] = []

  for (const specification of specificationRows) {
    const matchedOption = optionRows.find((optionRow) => {
      if (specification.optionId && specification.optionId === optionRow.optionId) {
        return true
      }

      if (!specification.optionReferences.length) {
        return false
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
    summaryRows.push({
      label: specification.label,
      value: matchedOption.value,
    })
  }

  for (const optionRow of optionRows) {
    if (usedOptionIds.has(optionRow.optionId)) {
      continue
    }

    summaryRows.push({
      label: optionRow.label,
      value: optionRow.value,
    })
  }

  return summaryRows.filter(
    (row, index, collection) =>
      collection.findIndex(
        (entry) =>
          normalizeCandidate(entry.label) === normalizeCandidate(row.label) &&
          normalizeCandidate(entry.value) === normalizeCandidate(row.value)
      ) === index
  )
}

export const buildLocalizedWhatsAppSelectionDetailsText = ({
  product,
  variantOptions,
  locale,
  variantTitle,
  presetTitle,
  setupLabel,
  includeVariantTitleFallback = false,
}: WhatsAppSelectionSummaryInput) => {
  const selectionRows = buildLocalizedWhatsAppSelectionRows({
    product,
    variantOptions,
    locale,
  })

  const detailParts = selectionRows.map((row) => `${row.label}: ${row.value}`)
  const normalizedVariantTitle = getTrimmedText(variantTitle)
  const normalizedPresetTitle = getTrimmedText(presetTitle)
  const normalizedSetupLabel = getTrimmedText(setupLabel)

  if (
    includeVariantTitleFallback &&
    !selectionRows.length &&
    normalizedVariantTitle &&
    normalizeCandidate(normalizedVariantTitle) !== "default variant"
  ) {
    detailParts.push(normalizedVariantTitle)
  }

  if (normalizedPresetTitle && normalizedSetupLabel) {
    detailParts.push(`${normalizedSetupLabel}: ${normalizedPresetTitle}`)
  }

  return detailParts.join(", ")
}

export const buildLocalizedWhatsAppProductLine = ({
  title,
  priceText,
  ...selectionSummary
}: WhatsAppProductLineInput) => {
  const detailsText = buildLocalizedWhatsAppSelectionDetailsText(selectionSummary)

  return [title, detailsText ? `(${detailsText})` : "", getTrimmedText(priceText) ? `- ${getTrimmedText(priceText)}` : ""]
    .filter(Boolean)
    .join(" ")
}

export const buildLocalizedWhatsAppCartLine = ({
  quantity,
  title,
  ...selectionSummary
}: WhatsAppCartLineInput) => {
  const detailsText = buildLocalizedWhatsAppSelectionDetailsText({
    ...selectionSummary,
    includeVariantTitleFallback: selectionSummary.includeVariantTitleFallback ?? true,
  })

  return `${quantity}x ${title}${detailsText ? ` (${detailsText})` : ""}`
}