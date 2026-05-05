import { describe, expect, it } from "vitest"

import {
  canFetchSearchSuggestions,
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
