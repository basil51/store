const MAX_SEARCH_QUERY_LENGTH = 80
export const MIN_SEARCH_SUGGESTION_QUERY_LENGTH = 2
export const SEARCH_SUGGESTION_LIMIT = 6

import type { SearchAnalyticsPayload } from "./analytics"

type SearchRankableProduct = {
  id: string
  title?: string | null
  handle?: string | null
}

export const normalizeSearchQuery = (value?: string | null) => {
  const normalized = value?.replace(/\s+/g, " ").trim()

  if (!normalized) {
    return undefined
  }

  return normalized.slice(0, MAX_SEARCH_QUERY_LENGTH)
}

export const hasSearchQuery = (value?: string | null) =>
  Boolean(normalizeSearchQuery(value))

export const canFetchSearchSuggestions = (value?: string | null) =>
  (normalizeSearchQuery(value)?.length ?? 0) >= MIN_SEARCH_SUGGESTION_QUERY_LENGTH

const normalizeForComparison = (value?: string | null) =>
  value
    ?.toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? ""

const normalizeSearchQueryForComparison = (value?: string | null) =>
  normalizeForComparison(normalizeSearchQuery(value))

export const getDistinctRecoveredSearchQuery = ({
  query,
  recoveryQuery,
  recoveryNormalizedQuery,
}: {
  query?: string | null
  recoveryQuery?: string | null
  recoveryNormalizedQuery?: string | null
}) => {
  const normalizedQuery = normalizeSearchQueryForComparison(query)
  const normalizedRecoveredQuery =
    normalizeSearchQueryForComparison(recoveryNormalizedQuery) ||
    normalizeSearchQueryForComparison(recoveryQuery)
  const normalizedRecoveryQuery = normalizeSearchQuery(recoveryQuery)

  return normalizedRecoveryQuery &&
    normalizedRecoveredQuery &&
    normalizedRecoveredQuery !== normalizedQuery
    ? normalizedRecoveryQuery
    : null
}

export const getNoSuggestionsTrackingUpdate = ({
  countryCode,
  isLoading,
  isOpen,
  lastTrackedQuery,
  normalizedQuery,
  recoveredQuery,
  suggestionCount,
}: {
  countryCode?: string | null
  isLoading: boolean
  isOpen: boolean
  lastTrackedQuery?: string | null
  normalizedQuery?: string | null
  recoveredQuery?: string | null
  suggestionCount: number
}) => {
  if (
    !isOpen ||
    isLoading ||
    !countryCode ||
    !canFetchSearchSuggestions(normalizedQuery) ||
    !normalizedQuery ||
    recoveredQuery ||
    suggestionCount > 0
  ) {
    return {
      nextTrackedQuery: !normalizedQuery || !isOpen ? null : lastTrackedQuery ?? null,
      trackQuery: null,
    }
  }

  if (lastTrackedQuery === normalizedQuery) {
    return {
      nextTrackedQuery: lastTrackedQuery,
      trackQuery: null,
    }
  }

  return {
    nextTrackedQuery: normalizedQuery,
    trackQuery: normalizedQuery,
  }
}

export const getRecoveredSuggestionsTrackingUpdate = ({
  countryCode,
  isLoading,
  isOpen,
  lastTrackedKey,
  normalizedQuery,
  recoveredQuery,
  recoverySource,
  suggestionCount,
}: {
  countryCode?: string | null
  isLoading: boolean
  isOpen: boolean
  lastTrackedKey?: string | null
  normalizedQuery?: string | null
  recoveredQuery?: string | null
  recoverySource?: "override" | "analytics" | null
  suggestionCount: number
}) => {
  if (
    !isOpen ||
    isLoading ||
    !countryCode ||
    !canFetchSearchSuggestions(normalizedQuery) ||
    !normalizedQuery ||
    !recoveredQuery ||
    !recoverySource ||
    suggestionCount <= 0
  ) {
    return {
      nextTrackedKey: !normalizedQuery || !isOpen ? null : lastTrackedKey ?? null,
      trackOriginalQuery: null,
      trackRecoveredQuery: null,
    }
  }

  const trackingKey = `${normalizedQuery}=>${recoveredQuery}`

  if (lastTrackedKey === trackingKey) {
    return {
      nextTrackedKey: lastTrackedKey,
      trackOriginalQuery: null,
      trackRecoveredQuery: null,
    }
  }

  return {
    nextTrackedKey: trackingKey,
    trackOriginalQuery: normalizedQuery,
    trackRecoveredQuery: recoveredQuery,
  }
}

export const getNavSearchSubmittedPayload = ({
  query,
  locale,
}: {
  query?: string | null
  locale?: string | null
}): SearchAnalyticsPayload | null => {
  const normalizedQuery = normalizeSearchQuery(query)

  if (!normalizedQuery) {
    return null
  }

  return {
    query: normalizedQuery,
    locale: locale ?? undefined,
    source: "nav",
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const countTokenPrefixMatches = (tokens: string[], queryTokens: string[]) => {
  const remaining = [...tokens]
  let matches = 0

  for (const queryToken of queryTokens) {
    const index = remaining.findIndex((token) => token.startsWith(queryToken))

    if (index >= 0) {
      matches += 1
      remaining.splice(index, 1)
    }
  }

  return matches
}

const scoreSearchProductMatch = (
  product: SearchRankableProduct,
  query: string,
  queryTokens: string[]
) => {
  const normalizedTitle = normalizeForComparison(product.title)
  const normalizedHandle = normalizeForComparison(product.handle)
  const titleTokens = normalizedTitle.split(" ").filter(Boolean)
  const handleTokens = normalizedHandle.split(" ").filter(Boolean)
  let score = 0

  if (normalizedTitle === query) {
    score += 160
  }

  if (normalizedHandle === query) {
    score += 140
  }

  if (normalizedTitle.startsWith(query)) {
    score += 100
  }

  if (normalizedHandle.startsWith(query)) {
    score += 80
  }

  if (normalizedTitle.includes(query)) {
    score += 45
  }

  if (normalizedHandle.includes(query)) {
    score += 30
  }

  const titlePrefixMatches = countTokenPrefixMatches(titleTokens, queryTokens)
  const handlePrefixMatches = countTokenPrefixMatches(handleTokens, queryTokens)

  score += titlePrefixMatches * 18
  score += handlePrefixMatches * 10

  const allQueryTokensInTitle = queryTokens.every((token) => normalizedTitle.includes(token))
  const allQueryTokensInHandle = queryTokens.every((token) => normalizedHandle.includes(token))

  if (allQueryTokensInTitle) {
    score += 24
  }

  if (allQueryTokensInHandle) {
    score += 12
  }

  if (queryTokens.length > 1) {
    const orderedTokenPattern = new RegExp(
      queryTokens.map((token) => escapeRegExp(token)).join(".*")
    )

    if (orderedTokenPattern.test(normalizedTitle)) {
      score += 18
    }

    if (orderedTokenPattern.test(normalizedHandle)) {
      score += 10
    }
  }

  return score
}

export const rankSearchProductsByQuery = <T extends SearchRankableProduct>(
  products: T[],
  query?: string | null
) => {
  const normalizedQuery = normalizeForComparison(normalizeSearchQuery(query))

  if (!normalizedQuery) {
    return products
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean)

  return products
    .map((product, index) => ({
      product,
      index,
      score: scoreSearchProductMatch(product, normalizedQuery, queryTokens),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.index - right.index
    })
    .map((entry) => entry.product)
}
