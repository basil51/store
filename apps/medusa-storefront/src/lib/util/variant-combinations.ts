import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"

export type ProductVariantCombination = {
  title: string
  summary?: string
  badge?: string
  isDefault?: boolean
  optionValues: Record<string, string>
}

export type ProductVariantCombinationDefaultsByType = Record<
  string,
  ProductVariantCombination[]
>

export type ResolvedProductVariantCombination = ProductVariantCombination & {
  key: string
  mappedOptionValues: Record<string, string>
  matchingVariant?: HttpTypes.StoreProductVariant
}

const normalizeCombinationSegment = (value: string) =>
  value.trim().toLowerCase()

export const getProductVariantCombinationKey = (
  optionValues: Record<string, string>
) => {
  return Object.entries(optionValues)
    .map(([optionTitle, value]) => [
      normalizeCombinationSegment(optionTitle),
      normalizeCombinationSegment(value),
    ])
    .filter(([optionTitle, value]) => optionTitle && value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([optionTitle, value]) =>
        `${encodeURIComponent(optionTitle)}=${encodeURIComponent(value)}`
    )
    .join("&")
}

export const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return (variantOptions ?? []).reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export const parseRawProductVariantCombinations = (
  rawValue: unknown
): ProductVariantCombination[] => {
  if (!Array.isArray(rawValue)) {
    return []
  }

  const normalized = rawValue
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map((entry) => {
      const optionValues = Object.entries(
        (entry.option_values as Record<string, unknown> | undefined) ?? {}
      ).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value !== "string") {
          return acc
        }

        const normalizedKey = key.trim()
        const normalizedValue = value.trim()

        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue
        }

        return acc
      }, {})

      return {
        title: typeof entry.title === "string" ? entry.title.trim() : "",
        summary: typeof entry.summary === "string" ? entry.summary.trim() : undefined,
        badge: typeof entry.badge === "string" ? entry.badge.trim() : undefined,
        isDefault: entry.is_default === true,
        optionValues,
      }
    })
    .filter((entry) => entry.title && Object.keys(entry.optionValues).length > 0)

  let didAssignDefault = false

  return normalized.map((entry) => {
    if (!entry.isDefault) {
      return entry
    }

    if (!didAssignDefault) {
      didAssignDefault = true
      return entry
    }

    return {
      ...entry,
      isDefault: false,
    }
  })
}

export const parseProductVariantCombinations = (
  metadata: HttpTypes.StoreProduct["metadata"]
): ProductVariantCombination[] => {
  return parseRawProductVariantCombinations(metadata?.variant_combinations)
}

export const getEffectiveProductVariantCombinations = (
  product: HttpTypes.StoreProduct,
  defaultsByType?: ProductVariantCombinationDefaultsByType
) => {
  const productLevelCombinations = parseProductVariantCombinations(product.metadata)

  if (productLevelCombinations.length) {
    return productLevelCombinations
  }

  const productType = product.type?.value?.trim()

  if (!productType || !defaultsByType) {
    return [] as ProductVariantCombination[]
  }

  return defaultsByType[productType] ?? []
}

export const resolveProductVariantCombinations = (
  product: HttpTypes.StoreProduct,
  defaultsByType?: ProductVariantCombinationDefaultsByType
): ResolvedProductVariantCombination[] => {
  const optionTitleToIdMap = (product.options ?? []).reduce<Record<string, string>>(
    (acc, option) => {
      const title = option.title?.trim()

      if (title) {
        acc[title] = option.id
      }

      return acc
    },
    {}
  )

  return getEffectiveProductVariantCombinations(product, defaultsByType)
    .map((combination) => {
      const mappedOptionValues = Object.entries(combination.optionValues).reduce<
        Record<string, string>
      >((acc, [optionTitle, value]) => {
        const optionId = optionTitleToIdMap[optionTitle]

        if (optionId) {
          acc[optionId] = value
        }

        return acc
      }, {})

      if (!Object.keys(mappedOptionValues).length) {
        return null
      }

      const matchingVariant = product.variants?.find((variant) =>
        isEqual(optionsAsKeymap(variant.options), mappedOptionValues)
      )

      const key = getProductVariantCombinationKey(combination.optionValues)

      if (!key) {
        return null
      }

      return {
        ...combination,
        key,
        mappedOptionValues,
        matchingVariant,
      }
    })
    .filter(
      (
        combination
      ): combination is ResolvedProductVariantCombination => !!combination
    )
}

export const getDefaultResolvedProductVariantCombination = (
  product: HttpTypes.StoreProduct,
  defaultsByType?: ProductVariantCombinationDefaultsByType
) => {
  return resolveProductVariantCombinations(product, defaultsByType).find(
    (combination) => combination.isDefault && combination.matchingVariant
  )
}

export const getPreferredResolvedProductVariantCombination = (
  product: HttpTypes.StoreProduct,
  defaultsByType?: ProductVariantCombinationDefaultsByType
) => {
  const resolvedCombinations = resolveProductVariantCombinations(
    product,
    defaultsByType
  ).filter((combination) => !!combination.matchingVariant)

  return (
    resolvedCombinations.find((combination) => combination.isDefault) ??
    resolvedCombinations[0]
  )
}

export const findResolvedProductVariantCombinationByKey = (
  product: HttpTypes.StoreProduct,
  defaultsByType?: ProductVariantCombinationDefaultsByType,
  key?: string
) => {
  if (!key) {
    return undefined
  }

  return resolveProductVariantCombinations(product, defaultsByType).find(
    (combination) => combination.key === key && combination.matchingVariant
  )
}