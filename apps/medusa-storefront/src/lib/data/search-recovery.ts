"use server"

import { sdk } from "@lib/config"

type SearchRecoveryResponse = {
  query: string
  normalized_query: string
  recovery_queries: Array<{
    query: string
    normalized_query: string
    score: number
    result_views: number
    average_results: number
    source: "override" | "analytics"
  }>
}

export async function getSearchRecovery({
  query,
  locale,
  countryCode,
}: {
  query: string
  locale?: string | null
  countryCode?: string | null
}) {
  if (!query) {
    return null
  }

  try {
    const data = await sdk.client.fetch<SearchRecoveryResponse>(
      "/store/analytics/search/recovery",
      {
        method: "GET",
        query: {
          q: query,
          ...(locale ? { locale } : {}),
          ...(countryCode ? { country_code: countryCode } : {}),
          limit: 3,
        },
        cache: "no-store",
      }
    )

    return data.recovery_queries[0] ?? null
  } catch {
    return null
  }
}