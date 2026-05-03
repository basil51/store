import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  customerUpdate: vi.fn(),
  getAuthHeaders: vi.fn(),
  getCacheTag: vi.fn(),
  headers: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@lib/config", () => ({
  sdk: {
    store: {
      customer: {
        update: mocks.customerUpdate,
      },
    },
  },
}))

vi.mock("./cookies", () => ({
  getAuthHeaders: mocks.getAuthHeaders,
  getCacheTag: mocks.getCacheTag,
  getCartId: vi.fn(),
  removeAuthToken: vi.fn(),
  removeCartId: vi.fn(),
  setAuthToken: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}))

import { updateCustomer } from "./customer"

describe("customer server action trusted-origin enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthHeaders.mockResolvedValue({ authorization: "Bearer token" })
    mocks.getCacheTag.mockResolvedValue("customers")
    mocks.customerUpdate.mockResolvedValue({ customer: { id: "cus_1" } })
  })

  it("rejects cross-origin requests before mutating customer data", async () => {
    const requestHeaders = new Headers({
      origin: "https://evil.example",
      "x-forwarded-host": "store.example",
      "x-forwarded-proto": "https",
    })

    mocks.headers.mockResolvedValue(requestHeaders)

    await expect(
      updateCustomer({ first_name: "Alice" } as any)
    ).rejects.toThrow("Cross-origin state-changing request rejected.")

    expect(mocks.getAuthHeaders).not.toHaveBeenCalled()
    expect(mocks.customerUpdate).not.toHaveBeenCalled()
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it("allows same-origin requests to continue into the customer mutation", async () => {
    const requestHeaders = new Headers({
      origin: "https://store.example",
      "x-forwarded-host": "store.example",
      "x-forwarded-proto": "https",
    })

    mocks.headers.mockResolvedValue(requestHeaders)

    await expect(
      updateCustomer({ first_name: "Alice" } as any)
    ).resolves.toEqual({ id: "cus_1" })

    expect(mocks.getAuthHeaders).toHaveBeenCalledTimes(1)
    expect(mocks.customerUpdate).toHaveBeenCalledWith(
      { first_name: "Alice" },
      {},
      { authorization: "Bearer token" }
    )
    expect(mocks.revalidateTag).toHaveBeenCalledWith("customers")
  })
})