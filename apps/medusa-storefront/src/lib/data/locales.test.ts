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

import { listLocales } from "./locales"

describe("listLocales", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getCacheOptionsMock.mockReset()
    getCacheOptionsMock.mockResolvedValue({ tags: ["tenant-locales-cache"] })
  })

  it("uses tenant-scoped cache options with timed revalidation", async () => {
    fetchMock.mockResolvedValueOnce({
      locales: [{ code: "en", name: "English" }],
    })

    const locales = await listLocales()

    expect(locales).toEqual([{ code: "en", name: "English" }])
    expect(getCacheOptionsMock).toHaveBeenCalledWith("locales")
    expect(fetchMock).toHaveBeenCalledWith("/store/locales", {
      method: "GET",
      next: {
        tags: ["tenant-locales-cache"],
        revalidate: 300,
      },
      cache: "force-cache",
    })
  })

  it("returns null when locales are unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("missing locales"))

    await expect(listLocales()).resolves.toBeNull()
  })
})