import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCacheOptionsMock } = vi.hoisted(() => ({
  getCacheOptionsMock: vi.fn(),
}))

vi.mock("./cookies", () => ({
  getCacheOptions: getCacheOptionsMock,
}))

import { ORDERS_REVALIDATE_SECONDS, getOrdersCacheOptions } from "./orders-cache"

describe("getOrdersCacheOptions", () => {
  beforeEach(() => {
    getCacheOptionsMock.mockReset()
  })

  it("merges tenant order cache tags with a short timed revalidation window", async () => {
    getCacheOptionsMock.mockResolvedValueOnce({ tags: ["tenant-orders-cache"] })

    await expect(getOrdersCacheOptions()).resolves.toEqual({
      tags: ["tenant-orders-cache"],
      revalidate: ORDERS_REVALIDATE_SECONDS,
    })
  })

  it("still returns a revalidation window when no order cache tag exists", async () => {
    getCacheOptionsMock.mockResolvedValueOnce({})

    await expect(getOrdersCacheOptions()).resolves.toEqual({
      revalidate: ORDERS_REVALIDATE_SECONDS,
    })
  })
})