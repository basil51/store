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

import { getCollectionByHandle } from "./collections"

const COLLECTION_FIELDS = "id,title,handle,metadata"

describe("collection reads", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getCatalogCacheOptionsMock.mockReset()
    getCatalogCacheOptionsMock.mockResolvedValue({
      tags: ["tenant-collections-cache"],
      revalidate: 300,
    })
  })

  it("looks up collection pages without loading product relation payloads", async () => {
    fetchMock.mockResolvedValueOnce({
      collections: [{ id: "pcol_1", title: "Dell", handle: "dell" }],
    })

    await expect(getCollectionByHandle("dell")).resolves.toEqual({
      id: "pcol_1",
      title: "Dell",
      handle: "dell",
    })

    expect(fetchMock).toHaveBeenCalledWith("/store/collections", {
      query: {
        handle: "dell",
        fields: COLLECTION_FIELDS,
      },
      next: {
        tags: ["tenant-collections-cache"],
        revalidate: 300,
      },
      cache: "force-cache",
    })
  })
})
