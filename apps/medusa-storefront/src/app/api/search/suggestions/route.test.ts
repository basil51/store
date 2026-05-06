import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSearchRecovery: vi.fn(),
  listProducts: vi.fn(),
}))

vi.mock("@lib/data/products", () => ({
  listProducts: mocks.listProducts,
}))

vi.mock("@lib/data/search-recovery", () => ({
  getSearchRecovery: mocks.getSearchRecovery,
}))

import { NextRequest } from "next/server"

import { GET } from "./route"

const createRequest = (search: string) =>
  new NextRequest(`http://localhost:8000/api/search/suggestions${search}`)

describe("GET /api/search/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an empty payload when the query should not trigger suggestions", async () => {
    const response = await GET(createRequest("?q=p&countryCode=il&locale=en"))

    expect(await response.json()).toEqual({
      query: "p",
      suggestions: [],
      recovered_query: null,
      recovery_source: null,
    })
    expect(mocks.listProducts).not.toHaveBeenCalled()
    expect(mocks.getSearchRecovery).not.toHaveBeenCalled()
  })

  it("returns ranked direct suggestions when product matches exist", async () => {
    mocks.listProducts.mockResolvedValue({
      response: {
        products: [
          {
            id: "prod_1",
            title: "Laptop Sleeve",
            handle: "laptop-sleeve",
            thumbnail: null,
          },
          {
            id: "prod_2",
            title: "Gaming Laptop Pro",
            handle: "gaming-rig",
            thumbnail: "https://example.com/laptop.jpg",
          },
          {
            id: "prod_3",
            title: "Hidden Draft",
            handle: null,
            thumbnail: null,
          },
        ],
      },
    })

    const response = await GET(
      createRequest("?q=gaming%20laptop&countryCode=il&locale=en")
    )

    expect(mocks.listProducts).toHaveBeenCalledWith({
      countryCode: "il",
      queryParams: {
        q: "gaming laptop",
        limit: 12,
        fields: "id,title,handle,thumbnail",
      },
    })
    expect(mocks.getSearchRecovery).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({
      query: "gaming laptop",
      suggestions: [
        {
          id: "prod_2",
          title: "Gaming Laptop Pro",
          handle: "gaming-rig",
          thumbnail: "https://example.com/laptop.jpg",
        },
        {
          id: "prod_1",
          title: "Laptop Sleeve",
          handle: "laptop-sleeve",
          thumbnail: null,
        },
      ],
      recovered_query: null,
      recovery_source: null,
    })
  })

  it("falls back to recovered-query suggestions when the direct query is empty", async () => {
    mocks.listProducts
      .mockResolvedValueOnce({
        response: {
          products: [],
        },
      })
      .mockResolvedValueOnce({
        response: {
          products: [
            {
              id: "prod_4",
              title: "Monitor Stand",
              handle: "monitor-stand",
              thumbnail: null,
            },
          ],
        },
      })
    mocks.getSearchRecovery.mockResolvedValue({
      query: "monitor stand",
      source: "analytics",
    })

    const response = await GET(
      createRequest("?q=monitro%20stand&countryCode=il&locale=he")
    )

    expect(mocks.getSearchRecovery).toHaveBeenCalledWith({
      query: "monitro stand",
      locale: "he",
      countryCode: "il",
    })
    expect(mocks.listProducts).toHaveBeenNthCalledWith(1, {
      countryCode: "il",
      queryParams: {
        q: "monitro stand",
        limit: 12,
        fields: "id,title,handle,thumbnail",
      },
    })
    expect(mocks.listProducts).toHaveBeenNthCalledWith(2, {
      countryCode: "il",
      queryParams: {
        q: "monitor stand",
        limit: 12,
        fields: "id,title,handle,thumbnail",
      },
    })
    expect(await response.json()).toEqual({
      query: "monitro stand",
      suggestions: [
        {
          id: "prod_4",
          title: "Monitor Stand",
          handle: "monitor-stand",
          thumbnail: null,
        },
      ],
      recovered_query: "monitor stand",
      recovery_source: "analytics",
    })
  })

  it("ignores recovery results that only normalize to the original query", async () => {
    mocks.listProducts.mockResolvedValueOnce({
      response: {
        products: [],
      },
    })
    mocks.getSearchRecovery.mockResolvedValue({
      query: "  Monitro   Stand  ",
      normalized_query: "monitro stand",
    })

    const response = await GET(
      createRequest("?q=monitro%20stand&countryCode=il&locale=en")
    )

    expect(mocks.getSearchRecovery).toHaveBeenCalledWith({
      query: "monitro stand",
      locale: "en",
      countryCode: "il",
    })
    expect(mocks.listProducts).toHaveBeenCalledTimes(1)
    expect(await response.json()).toEqual({
      query: "monitro stand",
      suggestions: [],
      recovered_query: null,
      recovery_source: null,
    })
  })
})