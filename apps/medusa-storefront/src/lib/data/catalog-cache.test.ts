import { describe, expect, it } from "vitest"

import {
  CATALOG_REVALIDATE_SECONDS,
  getCatalogCacheTag,
  getCatalogCacheOptions,
  normalizeCatalogCacheTags,
} from "./catalog-cache"

describe("getCatalogCacheOptions", () => {
  it("returns a stable catalog tag with a timed revalidation window", async () => {
    await expect(getCatalogCacheOptions("products")).resolves.toEqual({
      tags: ["catalog-products"],
      revalidate: CATALOG_REVALIDATE_SECONDS,
    })
  })

  it("exposes stable cache-tag helpers for revalidation callers", () => {
    expect(getCatalogCacheTag("collections")).toBe("catalog-collections")
    expect(
      normalizeCatalogCacheTags(["products", "collections", "products", "invalid"])
    ).toEqual(["catalog-products", "catalog-collections"])
  })

  it("falls back to all catalog tags when no specific tag list is provided", () => {
    expect(normalizeCatalogCacheTags()).toEqual([
      "catalog-products",
      "catalog-categories",
      "catalog-collections",
      "catalog-variants",
    ])
  })
})