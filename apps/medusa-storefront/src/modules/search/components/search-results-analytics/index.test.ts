import { describe, expect, it } from "vitest"

import { getSearchResultsViewedEvents } from "./index"

describe("SearchResultsAnalytics event shaping", () => {
  it("returns no events when there is no query", () => {
    expect(
      getSearchResultsViewedEvents({
        query: undefined,
        resultCount: 4,
        countryCode: "il",
      })
    ).toEqual([])
  })

  it("returns one direct store-results event for a normal results page", () => {
    expect(
      getSearchResultsViewedEvents({
        query: "monitor stand",
        resultCount: 3,
        locale: "en",
        countryCode: "il",
      })
    ).toEqual([
      {
        query: "monitor stand",
        result_count: 3,
        locale: "en",
        country_code: "il",
        source: "store",
      },
    ])
  })

  it("returns paired original and recovered events when recovery rescued a zero-result query", () => {
    expect(
      getSearchResultsViewedEvents({
        query: "monitro stand",
        resultCount: 5,
        locale: "en",
        countryCode: "il",
        recoveredQuery: "Monitor Stand",
        recoverySource: "analytics",
        originalResultCount: 0,
      })
    ).toEqual([
      {
        query: "monitro stand",
        result_count: 0,
        locale: "en",
        country_code: "il",
        source: "store",
        recovered_query: "Monitor Stand",
      },
      {
        query: "Monitor Stand",
        result_count: 5,
        locale: "en",
        country_code: "il",
        source: "store_recovery",
        recovery_source: "analytics",
        recovered_from_query: "monitro stand",
        original_result_count: 0,
      },
    ])
  })

  it("falls back to one direct event when recovered metadata exists without a zero-result origin", () => {
    expect(
      getSearchResultsViewedEvents({
        query: "monitor stand",
        resultCount: 2,
        locale: "en",
        countryCode: "il",
        recoveredQuery: "Monitor Stand",
        recoverySource: "override",
        originalResultCount: 1,
      })
    ).toEqual([
      {
        query: "monitor stand",
        result_count: 2,
        locale: "en",
        country_code: "il",
        source: "store",
      },
    ])
  })
})