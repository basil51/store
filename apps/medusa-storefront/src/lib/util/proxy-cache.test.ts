import { describe, expect, it } from "vitest"

import {
  REGION_MAP_REVALIDATE_SECONDS,
  buildRegionCacheTag,
  getRegionFetchCacheOptions,
} from "./proxy-cache"

describe("proxy-cache", () => {
  it("builds a shared region cache tag from the publishable key", () => {
    expect(buildRegionCacheTag("pk_test_shared")).toBe(
      "regions-pk_test_shared"
    )
  })

  it("falls back to the default region cache tag when no key exists", () => {
    expect(buildRegionCacheTag(undefined)).toBe("regions-default")
  })

  it("returns force-cache options without any per-visitor cache id", () => {
    expect(getRegionFetchCacheOptions("pk_test_shared")).toEqual({
      revalidate: REGION_MAP_REVALIDATE_SECONDS,
      tags: ["regions-pk_test_shared"],
    })
  })
})