import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getAuthHeadersMock: vi.fn(),
  getOrdersCacheOptionsMock: vi.fn(),
}))

vi.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: mocks.fetchMock,
    },
  },
}))

vi.mock("./cookies", () => ({
  getAuthHeaders: mocks.getAuthHeadersMock,
  getCacheTag: vi.fn(),
}))

vi.mock("./orders-cache", () => ({
  getOrdersCacheOptions: mocks.getOrdersCacheOptionsMock,
}))

import { retrieveOrder } from "./orders"

describe("order reads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthHeadersMock.mockResolvedValue({ authorization: "Bearer token" })
    mocks.getOrdersCacheOptionsMock.mockResolvedValue({
      tags: ["tenant-orders-cache"],
      revalidate: 60,
    })
  })

  it("falls back to the working orders list endpoint when direct order fetch fails", async () => {
    const order = {
      id: "order_1",
      display_id: 101,
      email: "basel@example.com",
      created_at: "2026-05-06T12:00:00.000Z",
      payment_collections: [],
      items: [],
      shipping_methods: [],
    }

    mocks.fetchMock
      .mockRejectedValueOnce(new Error("direct order fetch failed"))
      .mockResolvedValueOnce({ orders: [order] })

    await expect(retrieveOrder("order_1")).resolves.toEqual(order)

    expect(mocks.fetchMock).toHaveBeenNthCalledWith(1, "/store/orders/order_1", {
      method: "GET",
      query: {
        fields:
          "*,*payment_collections,*payment_collections.payments,*items,+items.metadata,*items.variant,*items.product,*shipping_methods",
      },
      headers: { authorization: "Bearer token" },
      next: {
        tags: ["tenant-orders-cache"],
        revalidate: 60,
      },
      cache: "force-cache",
    })

    expect(mocks.fetchMock).toHaveBeenNthCalledWith(2, "/store/orders", {
      method: "GET",
      query: {
        limit: 100,
        order: "-created_at",
        fields:
          "*,*payment_collections,*payment_collections.payments,*items,+items.metadata,*items.variant,*items.product,*shipping_methods",
      },
      headers: { authorization: "Bearer token" },
      next: {
        tags: ["tenant-orders-cache"],
        revalidate: 60,
      },
      cache: "force-cache",
    })
  })
})