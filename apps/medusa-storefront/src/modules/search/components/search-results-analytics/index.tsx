"use client"

import { useEffect } from "react"

import { trackSearchResultsViewed } from "@lib/util/analytics"
import type { SearchAnalyticsPayload } from "@lib/util/analytics"

type SearchResultsAnalyticsProps = {
  query?: string
  resultCount: number
  locale?: string | null
  countryCode: string
  recoveredQuery?: string
  recoverySource?: "override" | "analytics"
  originalResultCount?: number
}

export const getSearchResultsViewedEvents = ({
  query,
  resultCount,
  locale,
  countryCode,
  recoveredQuery,
  recoverySource,
  originalResultCount,
}: SearchResultsAnalyticsProps): SearchAnalyticsPayload[] => {
  if (!query) {
    return []
  }

  if (recoveredQuery && originalResultCount === 0) {
    return [
      {
        query,
        result_count: 0,
        locale: locale ?? undefined,
        country_code: countryCode,
        source: "store",
        recovered_query: recoveredQuery,
      },
      {
        query: recoveredQuery,
        result_count: resultCount,
        locale: locale ?? undefined,
        country_code: countryCode,
        source: "store_recovery",
        recovery_source: recoverySource,
        recovered_from_query: query,
        original_result_count: originalResultCount,
      },
    ]
  }

  return [
    {
      query,
      result_count: resultCount,
      locale: locale ?? undefined,
      country_code: countryCode,
      source: "store",
    },
  ]
}

export default function SearchResultsAnalytics({
  query,
  resultCount,
  locale,
  countryCode,
  recoveredQuery,
  recoverySource,
  originalResultCount,
}: SearchResultsAnalyticsProps) {
  useEffect(() => {
    getSearchResultsViewedEvents({
      query,
      resultCount,
      locale,
      countryCode,
      recoveredQuery,
      recoverySource,
      originalResultCount,
    })
      .forEach((payload) => {
        trackSearchResultsViewed(payload)
      })
  }, [
    countryCode,
    locale,
    originalResultCount,
    query,
    recoveredQuery,
    recoverySource,
    resultCount,
  ])

  return null
}
