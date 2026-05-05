import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchMock, getCatalogCacheOptionsMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getCatalogCacheOptionsMock: vi.fn(),
}))

vi.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: fetchMock,
    },
  },
}))

vi.mock("./catalog-cache", () => ({
  getCatalogCacheOptions: getCatalogCacheOptionsMock,
}))

import { CATEGORY_FIELDS, getCategoryByHandle, listCategories } from "./categories"

describe("category reads", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getCatalogCacheOptionsMock.mockReset()
    getCatalogCacheOptionsMock.mockResolvedValue({
      tags: ["tenant-categories-cache"],
      revalidate: 300,
    })
  })

  it("requests base category fields along with relationships for sidebar links", async () => {
    fetchMock.mockResolvedValueOnce({
      product_categories: [{ id: "pcat_1", name: "Laptops", handle: "computers" }],
    })

    await expect(listCategories({ limit: 30 })).resolves.toEqual([
      { id: "pcat_1", name: "Laptops", handle: "computers" },
    ])

    expect(fetchMock).toHaveBeenCalledWith("/store/product-categories", {
      query: {
        fields: CATEGORY_FIELDS,
        limit: 30,
      },
      next: {
        tags: ["tenant-categories-cache"],
        revalidate: 300,
      },
      cache: "force-cache",
    })
  })

  it("looks up category pages by handle with the same base field set", async () => {
    fetchMock.mockResolvedValueOnce({
      product_categories: [
        { id: "pcat_1", name: "Laptops", handle: "computers" },
      ],
    })

    await expect(getCategoryByHandle(["computers"])).resolves.toEqual({
      id: "pcat_1",
      name: "Laptops",
      handle: "computers",
    })

    expect(fetchMock).toHaveBeenCalledWith("/store/product-categories", {
      query: {
        fields: CATEGORY_FIELDS,
        handle: "computers",
      },
      next: {
        tags: ["tenant-categories-cache"],
        revalidate: 300,
      },
      cache: "force-cache",
    })
  })
})
