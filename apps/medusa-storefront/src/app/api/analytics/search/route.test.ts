import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  resolveTenantPublishableKey: vi.fn(),
  canUseDefaultPublishableKeyFallback: vi.fn(),
  validateTrustedOrigin: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}))

vi.mock("@lib/util/tenant", () => ({
  TENANT_COOKIE_NAME: "_medusa_store_tenant",
  TENANT_PUBLISHABLE_KEY_COOKIE_NAME: "_medusa_store_publishable_key",
  resolveTenantPublishableKey: mocks.resolveTenantPublishableKey,
  canUseDefaultPublishableKeyFallback: mocks.canUseDefaultPublishableKeyFallback,
}))

vi.mock("@lib/util/trusted-origin", () => ({
  validateTrustedOrigin: mocks.validateTrustedOrigin,
}))

import { NextRequest, NextResponse } from "next/server"

import { POST } from "./route"

const originalBackendUrl = process.env.MEDUSA_BACKEND_URL
const originalPublishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const originalFetch = globalThis.fetch

const createRequest = ({
  body = JSON.stringify({
    event_name: "search_results_viewed",
    payload: { query: "monitor stand", result_count: 2 },
  }),
  headers,
}: {
  body?: string
  headers?: Record<string, string>
} = {}) =>
  new NextRequest("http://localhost:8000/api/analytics/search", {
    method: "POST",
    headers: {
      origin: "http://localhost:8000",
      "content-type": "application/json",
      ...headers,
    },
    body,
  })

const setCookieStore = (values: Record<string, string>) => {
  mocks.cookies.mockResolvedValue({
    get: (name: string) =>
      values[name] ? { name, value: values[name] } : undefined,
  })
}

describe("POST /api/analytics/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MEDUSA_BACKEND_URL = "http://medusa.test"
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_default_test"
    setCookieStore({})
    mocks.validateTrustedOrigin.mockReturnValue({ ok: true })
    mocks.resolveTenantPublishableKey.mockReturnValue("pk_test_search")
    mocks.canUseDefaultPublishableKeyFallback.mockReturnValue(true)
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify({ accepted: true }), {
        status: 202,
        headers: {
          "content-type": "application/json",
        },
      })
    )
    vi.stubGlobal("fetch", mocks.fetch)
  })

  afterAll(() => {
    process.env.MEDUSA_BACKEND_URL = originalBackendUrl
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = originalPublishableKey
    globalThis.fetch = originalFetch
  })

  it("rejects untrusted requests before forwarding analytics", async () => {
    mocks.validateTrustedOrigin.mockReturnValue({
      ok: false,
      response: NextResponse.json(
        { message: "Cross-origin state-changing request rejected." },
        { status: 403 }
      ),
    })

    const response = await POST(createRequest())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      message: "Cross-origin state-changing request rejected.",
    })
    expect(mocks.resolveTenantPublishableKey).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON bodies without calling the backend sink", async () => {
    const response = await POST(createRequest({ body: "not-json" }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message: "Analytics payload must be valid JSON.",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("fails when no publishable key can be resolved for the tenant", async () => {
    setCookieStore({
      _medusa_store_tenant: "demo-store",
    })
    mocks.resolveTenantPublishableKey.mockReturnValue(null)
    mocks.canUseDefaultPublishableKeyFallback.mockReturnValue(false)

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      message:
        "Tenant 'demo-store' is missing a publishable API key for analytics sink.",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("forwards analytics payloads with publishable key and request headers", async () => {
    setCookieStore({
      _medusa_store_tenant: "demo-store",
      _medusa_store_publishable_key: "pk_demo_store",
    })

    const response = await POST(
      createRequest({
        headers: {
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "Vitest Browser",
        },
      })
    )

    expect(mocks.resolveTenantPublishableKey).toHaveBeenCalledWith({
      tenantSlug: "demo-store",
      tenantPublishableKey: "pk_demo_store",
      defaultPublishableKey: "pk_default_test",
    })
    expect(mocks.fetch).toHaveBeenCalledWith(
      "http://medusa.test/store/analytics/search",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": "pk_test_search",
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "Vitest Browser",
        },
        body: JSON.stringify({
          event_name: "search_results_viewed",
          payload: { query: "monitor stand", result_count: 2 },
        }),
        cache: "no-store",
      }
    )
    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: true })
  })
})