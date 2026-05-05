import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}))

import { NextRequest } from "next/server"

import { POST } from "./route"

describe("POST /api/internal/revalidate-catalog", () => {
  const originalSecret = process.env.STOREFRONT_REVALIDATE_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STOREFRONT_REVALIDATE_SECRET = "test-secret"
  })

  afterAll(() => {
    process.env.STOREFRONT_REVALIDATE_SECRET = originalSecret
  })

  it("rejects requests without the expected bearer token", async () => {
    const request = new NextRequest(
      "http://localhost:8000/api/internal/revalidate-catalog",
      {
        method: "POST",
        body: JSON.stringify({ tags: ["products"] }),
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it("revalidates normalized catalog tags when authorized", async () => {
    const request = new NextRequest(
      "http://localhost:8000/api/internal/revalidate-catalog",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tags: ["products", "collections", "products", "invalid"],
        }),
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(1, "catalog-products")
    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(2, "catalog-collections")
    expect(await response.json()).toEqual({
      revalidated: ["catalog-products", "catalog-collections"],
    })
  })
})