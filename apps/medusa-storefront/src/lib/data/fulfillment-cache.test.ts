import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCacheOptionsMock } = vi.hoisted(() => ({
  getCacheOptionsMock: vi.fn(),
}))

vi.mock("./cookies", () => ({
  getCacheOptions: getCacheOptionsMock,
}))

import {
  FULFILLMENT_REVALIDATE_SECONDS,
  getFulfillmentCacheOptions,
} from "./fulfillment-cache"

describe("getFulfillmentCacheOptions", () => {
  beforeEach(() => {
    getCacheOptionsMock.mockReset()
  })

  it("uses the fulfillment cache tag with timed revalidation", async () => {
    getCacheOptionsMock.mockResolvedValueOnce({
      tags: ["tenant-fulfillment-cache"],
    })

    await expect(getFulfillmentCacheOptions()).resolves.toEqual({
      tags: ["tenant-fulfillment-cache"],
      revalidate: FULFILLMENT_REVALIDATE_SECONDS,
    })
  })

  it("still returns a revalidation window when no fulfillment tag exists", async () => {
    getCacheOptionsMock.mockResolvedValueOnce({})

    await expect(getFulfillmentCacheOptions()).resolves.toEqual({
      revalidate: FULFILLMENT_REVALIDATE_SECONDS,
    })
  })
})