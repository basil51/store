import { listProducts } from "@lib/data/products"
import { getSearchRecovery } from "@lib/data/search-recovery"
import {
  canFetchSearchSuggestions,
  normalizeSearchQuery,
  rankSearchProductsByQuery,
  SEARCH_SUGGESTION_LIMIT,
} from "@lib/util/search"
import { NextRequest, NextResponse } from "next/server"

const SEARCH_SUGGESTION_FETCH_LIMIT = 12

const normalizeCountryCode = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase()

  return normalized && /^[a-z]{2}$/.test(normalized) ? normalized : null
}

const normalizeLocale = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase()

  return normalized && /^[a-z]{2}$/.test(normalized) ? normalized : null
}

const getSuggestionsForQuery = async ({
  query,
  countryCode,
}: {
  query: string
  countryCode: string
}) => {
  const { response } = await listProducts({
    countryCode,
    queryParams: {
      q: query,
      limit: SEARCH_SUGGESTION_FETCH_LIMIT,
      fields: "id,title,handle,thumbnail",
    },
  })

  return rankSearchProductsByQuery(
    response.products.filter((product) => product.handle),
    query
  ).slice(0, SEARCH_SUGGESTION_LIMIT)
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const query = normalizeSearchQuery(searchParams.get("q"))
  const countryCode = normalizeCountryCode(searchParams.get("countryCode"))
  const locale = normalizeLocale(searchParams.get("locale"))

  if (!query || !canFetchSearchSuggestions(query) || !countryCode) {
    return NextResponse.json({
      query: query ?? "",
      suggestions: [],
      recovered_query: null,
    })
  }

  const suggestions = await getSuggestionsForQuery({ query, countryCode })

  if (suggestions.length) {
    return NextResponse.json({
      query,
      suggestions: suggestions.map((product) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
      })),
      recovered_query: null,
    })
  }

  const recovery = await getSearchRecovery({
    query,
    locale,
    countryCode,
  })

  const recoveredQuery =
    recovery?.query && recovery.query !== query ? recovery.query : null

  const recoveredSuggestions = recoveredQuery
    ? await getSuggestionsForQuery({ query: recoveredQuery, countryCode })
    : []

  return NextResponse.json({
    query,
    suggestions: recoveredSuggestions.map((product) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
      })),
    recovered_query: recoveredQuery,
  })
}
