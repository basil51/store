import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}))

vi.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: fetchMock,
    },
  },
}))

import { getStorefrontSettings } from "./currency"

describe("getStorefrontSettings", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it("uses store default_stock_mode when product metadata fallback is configured", async () => {
    fetchMock.mockResolvedValueOnce({
      default_stock_mode: "track_hidden",
    })

    const settings = await getStorefrontSettings()

    expect(settings.defaultStockMode).toBe("track_hidden")
  })

  it("falls back to track_visible when store default_stock_mode is invalid", async () => {
    fetchMock.mockResolvedValueOnce({
      default_stock_mode: "unsupported_mode",
    })

    const settings = await getStorefrontSettings()

    expect(settings.defaultStockMode).toBe("track_visible")
  })
})
