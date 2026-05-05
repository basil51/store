import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCacheOptionsMock } = vi.hoisted(() => ({
  getCacheOptionsMock: vi.fn(),
}))

vi.mock("./cookies", () => ({
  getCacheOptions: getCacheOptionsMock,
}))

import {
  REGIONS_MAP_MAX_AGE_MS,
  REGIONS_REVALIDATE_SECONDS,
  getRegionsCacheOptions,
  isRegionMapEntryFresh,
} from "./regions-cache"

describe("regions-cache", () => {
  beforeEach(() => {
    getCacheOptionsMock.mockReset()
  })

  it("merges tenant region cache tags with timed revalidation", async () => {
    getCacheOptionsMock.mockResolvedValueOnce({ tags: ["tenant-regions-cache"] })

    await expect(getRegionsCacheOptions("regions")).resolves.toEqual({
      tags: ["tenant-regions-cache"],
      revalidate: REGIONS_REVALIDATE_SECONDS,
    })
  })

  it("treats recent in-memory region maps as fresh", () => {
    const now = 1_000_000

    expect(isRegionMapEntryFresh(now - 1, now)).toBe(true)
    expect(isRegionMapEntryFresh(now - REGIONS_MAP_MAX_AGE_MS - 1, now)).toBe(false)
  })
})