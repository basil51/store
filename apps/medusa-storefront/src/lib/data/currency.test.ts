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

import { getStorefrontSettings } from "./currency"

describe("getStorefrontSettings", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getCacheOptionsMock.mockReset()
    getCacheOptionsMock.mockResolvedValue({
      tags: ["tenant-storefront-settings-cache"],
    })
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

  it("returns the configured contact email when the store exposes one", async () => {
    fetchMock.mockResolvedValueOnce({
      contact_email: "support@sparkco.vip",
    })

    const settings = await getStorefrontSettings()

    expect(settings.contactEmail).toBe("support@sparkco.vip")
  })

  it("falls back to the default contact email when store config omits it", async () => {
    fetchMock.mockResolvedValueOnce({})

    const settings = await getStorefrontSettings()

    expect(settings.contactEmail).toBe("info@sparkco.vip")
  })

  it("uses cached storefront-settings fetch options for read-only store config", async () => {
    fetchMock.mockResolvedValueOnce({})

    await getStorefrontSettings()

    expect(getCacheOptionsMock).toHaveBeenCalledWith("storefront-settings")
    expect(fetchMock).toHaveBeenCalledWith("/store/store-currency-config", {
      method: "GET",
      next: {
        tags: ["tenant-storefront-settings-cache"],
        revalidate: 300,
      },
      cache: "force-cache",
    })
  })
})
