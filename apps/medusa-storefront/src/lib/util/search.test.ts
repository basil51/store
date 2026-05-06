import { describe, expect, it } from "vitest"

import {
  canFetchSearchSuggestions,
  getDistinctRecoveredSearchQuery,
  getNavSearchSubmittedPayload,
  getNoSuggestionsTrackingUpdate,
  getRecoveredSuggestionsTrackingUpdate,
  hasSearchQuery,
  normalizeSearchQuery,
  rankSearchProductsByQuery,
} from "./search"

describe("search query helpers", () => {
  it("normalizes whitespace and ignores empty queries", () => {
    expect(normalizeSearchQuery("  gaming   laptop  ")).toBe("gaming laptop")
    expect(normalizeSearchQuery("   ")).toBeUndefined()
  })

  it("bounds query length before forwarding to product search", () => {
    expect(normalizeSearchQuery("x".repeat(100))).toHaveLength(80)
  })

  it("detects whether a usable query exists", () => {
    expect(hasSearchQuery("monitor")).toBe(true)
    expect(hasSearchQuery("   ")).toBe(false)
  })

  it("requires enough signal before fetching suggestions", () => {
    expect(canFetchSearchSuggestions("p")).toBe(false)
    expect(canFetchSearchSuggestions("pr")).toBe(true)
  })

  it("returns distinct recovered queries after normalization", () => {
    expect(
      getDistinctRecoveredSearchQuery({
        query: "monitro stand",
        recoveryQuery: "monitor stand",
        recoveryNormalizedQuery: "monitor stand",
      })
    ).toBe("monitor stand")
  })

  it("ignores recovered queries that only differ by formatting", () => {
    expect(
      getDistinctRecoveredSearchQuery({
        query: "monitro stand",
        recoveryQuery: "  Monitro   Stand  ",
        recoveryNormalizedQuery: "monitro stand",
      })
    ).toBeNull()
  })

  it("returns a trackable query for the first empty nav suggestions view", () => {
    expect(
      getNoSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: false,
        isOpen: true,
        lastTrackedQuery: null,
        normalizedQuery: "monitor stand",
        recoveredQuery: null,
        suggestionCount: 0,
      })
    ).toEqual({
      nextTrackedQuery: "monitor stand",
      trackQuery: "monitor stand",
    })
  })

  it("suppresses duplicate tracking while the same empty query stays open", () => {
    expect(
      getNoSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: false,
        isOpen: true,
        lastTrackedQuery: "monitor stand",
        normalizedQuery: "monitor stand",
        recoveredQuery: null,
        suggestionCount: 0,
      })
    ).toEqual({
      nextTrackedQuery: "monitor stand",
      trackQuery: null,
    })
  })

  it("resets after closing so reopening the same query can track again", () => {
    const closedUpdate = getNoSuggestionsTrackingUpdate({
      countryCode: "us",
      isLoading: false,
      isOpen: false,
      lastTrackedQuery: "monitor stand",
      normalizedQuery: "monitor stand",
      recoveredQuery: null,
      suggestionCount: 0,
    })

    expect(closedUpdate).toEqual({
      nextTrackedQuery: null,
      trackQuery: null,
    })

    expect(
      getNoSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: false,
        isOpen: true,
        lastTrackedQuery: closedUpdate.nextTrackedQuery,
        normalizedQuery: "monitor stand",
        recoveredQuery: null,
        suggestionCount: 0,
      })
    ).toEqual({
      nextTrackedQuery: "monitor stand",
      trackQuery: "monitor stand",
    })
  })

  it("keeps the previous tracked query when empty tracking is temporarily ineligible", () => {
    expect(
      getNoSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: true,
        isOpen: true,
        lastTrackedQuery: "monitor stand",
        normalizedQuery: "monitor stand",
        recoveredQuery: null,
        suggestionCount: 0,
      })
    ).toEqual({
      nextTrackedQuery: "monitor stand",
      trackQuery: null,
    })
  })

  it("returns paired tracking queries for the first recovered suggestions view", () => {
    expect(
      getRecoveredSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: false,
        isOpen: true,
        lastTrackedKey: null,
        normalizedQuery: "monitro stand",
        recoveredQuery: "Monitor Stand",
        recoverySource: "analytics",
        suggestionCount: 1,
      })
    ).toEqual({
      nextTrackedKey: "monitro stand=>Monitor Stand",
      trackOriginalQuery: "monitro stand",
      trackRecoveredQuery: "Monitor Stand",
    })
  })

  it("suppresses duplicate tracking while the same recovered suggestions stay open", () => {
    expect(
      getRecoveredSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: false,
        isOpen: true,
        lastTrackedKey: "monitro stand=>Monitor Stand",
        normalizedQuery: "monitro stand",
        recoveredQuery: "Monitor Stand",
        recoverySource: "analytics",
        suggestionCount: 1,
      })
    ).toEqual({
      nextTrackedKey: "monitro stand=>Monitor Stand",
      trackOriginalQuery: null,
      trackRecoveredQuery: null,
    })
  })

  it("resets recovered tracking after close so reopening can track again", () => {
    const closedUpdate = getRecoveredSuggestionsTrackingUpdate({
      countryCode: "us",
      isLoading: false,
      isOpen: false,
      lastTrackedKey: "monitro stand=>Monitor Stand",
      normalizedQuery: "monitro stand",
      recoveredQuery: "Monitor Stand",
      recoverySource: "analytics",
      suggestionCount: 1,
    })

    expect(closedUpdate).toEqual({
      nextTrackedKey: null,
      trackOriginalQuery: null,
      trackRecoveredQuery: null,
    })

    expect(
      getRecoveredSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: false,
        isOpen: true,
        lastTrackedKey: closedUpdate.nextTrackedKey,
        normalizedQuery: "monitro stand",
        recoveredQuery: "Monitor Stand",
        recoverySource: "analytics",
        suggestionCount: 1,
      })
    ).toEqual({
      nextTrackedKey: "monitro stand=>Monitor Stand",
      trackOriginalQuery: "monitro stand",
      trackRecoveredQuery: "Monitor Stand",
    })
  })

  it("keeps the previous recovered tracking key while loading blocks re-emission", () => {
    expect(
      getRecoveredSuggestionsTrackingUpdate({
        countryCode: "us",
        isLoading: true,
        isOpen: true,
        lastTrackedKey: "monitro stand=>Monitor Stand",
        normalizedQuery: "monitro stand",
        recoveredQuery: "Monitor Stand",
        recoverySource: "analytics",
        suggestionCount: 1,
      })
    ).toEqual({
      nextTrackedKey: "monitro stand=>Monitor Stand",
      trackOriginalQuery: null,
      trackRecoveredQuery: null,
    })
  })

  it("returns a normalized nav submission payload for a valid query", () => {
    expect(
      getNavSearchSubmittedPayload({
        query: "  gaming   laptop  ",
        locale: "en",
      })
    ).toEqual({
      query: "gaming laptop",
      locale: "en",
      source: "nav",
    })
  })

  it("drops nav submission tracking for empty queries", () => {
    expect(
      getNavSearchSubmittedPayload({
        query: "   ",
        locale: "en",
      })
    ).toBeNull()
  })

  it("bounds nav submission payload queries to the shared max length", () => {
    expect(
      getNavSearchSubmittedPayload({
        query: "x".repeat(120),
        locale: null,
      })
    ).toEqual({
      query: "x".repeat(80),
      locale: undefined,
      source: "nav",
    })
  })

  it("ranks closer title matches ahead of looser handle matches", () => {
    const ranked = rankSearchProductsByQuery(
      [
        { id: "1", title: "Laptop Sleeve", handle: "laptop-sleeve" },
        { id: "2", title: "Gaming Laptop Pro", handle: "gaming-rig" },
        { id: "3", title: "Pro Machine", handle: "gaming-laptop-pro" },
      ],
      "gaming laptop"
    )

    expect(ranked.map((product) => product.id)).toEqual(["2", "3", "1"])
  })

  it("keeps original order when normalized search scores tie", () => {
    const ranked = rankSearchProductsByQuery(
      [
        { id: "1", title: "Monitor Stand", handle: "monitor-stand" },
        { id: "2", title: "Monitor Stand", handle: "monitor-stand-v2" },
      ],
      "monitor stand"
    )

    expect(ranked.map((product) => product.id)).toEqual(["1", "2"])
  })
})
