import { describe, expect, it } from "vitest"

import {
  calculateRecommendationAnalyticsBoost,
  rankRecommendedProductEntries,
  rankRecommendedProducts,
} from "./product-recommendations"

describe("product recommendation ranking", () => {
  it("prioritizes products that match stronger and multiple signals", () => {
    const ranked = rankRecommendedProducts({
      sourceProductId: "source",
      buckets: {
        collection: [{ id: "combo" }, { id: "collection-only" }],
        category: [{ id: "category-only" }],
        tag: [{ id: "combo" }, { id: "tag-only" }],
      },
    })

    expect(ranked.map((product) => product.id)).toEqual([
      "combo",
      "collection-only",
      "category-only",
      "tag-only",
    ])
  })

  it("excludes the source product and respects the requested limit", () => {
    const ranked = rankRecommendedProducts({
      sourceProductId: "source",
      limit: 2,
      buckets: {
        collection: [{ id: "source" }, { id: "first" }],
        category: [{ id: "second" }],
        tag: [{ id: "third" }],
      },
    })

    expect(ranked.map((product) => product.id)).toEqual(["first", "second"])
  })

  it("returns matched recommendation buckets for explanation UI", () => {
    const ranked = rankRecommendedProductEntries({
      sourceProductId: "source",
      buckets: {
        collection: [{ id: "combo" }, { id: "collection-only" }],
        category: [{ id: "combo" }],
        tag: [{ id: "tag-only" }],
      },
    })

    expect(ranked[0]).toEqual({
      product: { id: "combo" },
      matchedBuckets: ["collection", "category"],
      score: 10,
      baseScore: 10,
      analyticsBoost: 0,
    })
  })

  it("uses analytics boosts to reorder products within the same signal bucket", () => {
    const ranked = rankRecommendedProductEntries({
      sourceProductId: "source",
      buckets: {
        collection: [{ id: "first" }, { id: "second" }],
      },
      analyticsBoosts: {
        first: 0.1,
        second: 0.8,
      },
    })

    expect(ranked.map((product) => product.product.id)).toEqual([
      "second",
      "first",
    ])
  })

  it("caps analytics boosts below primary signal bucket gaps", () => {
    expect(
      calculateRecommendationAnalyticsBoost({ clicks: 10, railViews: 10 })
    ).toBeLessThan(2)
  })
})