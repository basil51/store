import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchMock, getCacheOptionsMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getCacheOptionsMock: vi.fn(),
}))

vi.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: fetchMock,
    },
  },
}))

vi.mock("./cookies", () => ({
  getCacheOptions: getCacheOptionsMock,
}))

import { getTickerMessages } from "./ticker"

describe("getTickerMessages", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getCacheOptionsMock.mockReset()
    getCacheOptionsMock.mockResolvedValue({ tags: ["tenant-ticker-cache"] })
  })

  it("uses tenant-scoped cache options for ticker reads", async () => {
    fetchMock.mockResolvedValueOnce({ messages: ["Tenant ticker message"] })

    const messages = await getTickerMessages()

    expect(messages).toEqual(["Tenant ticker message"])
    expect(getCacheOptionsMock).toHaveBeenCalledWith("ticker")
    expect(fetchMock).toHaveBeenCalledWith("/store/ticker", {
      method: "GET",
      next: {
        tags: ["tenant-ticker-cache"],
        revalidate: 60,
      },
      cache: "force-cache",
    })
  })

  it("falls back to default messages when the ticker request fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"))

    const messages = await getTickerMessages()

    expect(messages.length).toBeGreaterThan(0)
    expect(messages).toContain("🚀 Free shipping on orders over $99")
  })
})