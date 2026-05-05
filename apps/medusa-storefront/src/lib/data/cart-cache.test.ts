import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCacheOptionsMock } = vi.hoisted(() => ({
  getCacheOptionsMock: vi.fn(),
}))

vi.mock("./cookies", () => ({
  getCacheOptions: getCacheOptionsMock,
}))

import { CART_REVALIDATE_SECONDS, getCartCacheOptions } from "./cart-cache"

describe("getCartCacheOptions", () => {
  beforeEach(() => {
    getCacheOptionsMock.mockReset()
  })

  it("merges tenant cart cache tags with short timed revalidation", async () => {
    getCacheOptionsMock.mockResolvedValueOnce({ tags: ["tenant-carts-cache"] })

    await expect(getCartCacheOptions()).resolves.toEqual({
      tags: ["tenant-carts-cache"],
      revalidate: CART_REVALIDATE_SECONDS,
    })
  })

  it("still returns a revalidation window when no cart cache tag exists", async () => {
    getCacheOptionsMock.mockResolvedValueOnce({})

    await expect(getCartCacheOptions()).resolves.toEqual({
      revalidate: CART_REVALIDATE_SECONDS,
    })
  })
})