import { describe, expect, it } from "vitest"

import {
  getServerActionRequestOrigin,
  getTrustedRequestOrigin,
  validateTrustedOrigin,
  validateTrustedOriginHeaders,
} from "./trusted-origin"

const makeRequest = (input?: { origin?: string; referer?: string; url?: string }) => {
  const headers = new Headers()

  if (input?.origin) {
    headers.set("origin", input.origin)
  }

  if (input?.referer) {
    headers.set("referer", input.referer)
  }

  return {
    headers,
    nextUrl: new URL(input?.url ?? "http://localhost:8000/api/analytics/preset"),
  } as const
}

const makeHeaders = (input?: {
  origin?: string
  referer?: string
  host?: string
  forwardedHost?: string
  forwardedProto?: string
}) => {
  const headers = new Headers()

  if (input?.origin) {
    headers.set("origin", input.origin)
  }

  if (input?.referer) {
    headers.set("referer", input.referer)
  }

  if (input?.host) {
    headers.set("host", input.host)
  }

  if (input?.forwardedHost) {
    headers.set("x-forwarded-host", input.forwardedHost)
  }

  if (input?.forwardedProto) {
    headers.set("x-forwarded-proto", input.forwardedProto)
  }

  return headers
}

describe("trusted origin validation", () => {
  it("accepts same-origin POST requests via origin header", async () => {
    const result = validateTrustedOrigin(
      makeRequest({
        origin: "http://localhost:8000",
      }) as any
    )

    expect(result.ok).toBe(true)
  })

  it("accepts same-origin fallback via referer when origin is absent", () => {
    expect(
      getTrustedRequestOrigin(
        makeRequest({
          referer: "http://localhost:8000/en/products/test?x=1",
        }) as any
      )
    ).toBe("http://localhost:8000")

    const result = validateTrustedOrigin(
      makeRequest({
        referer: "http://localhost:8000/en/products/test?x=1",
      }) as any
    )

    expect(result.ok).toBe(true)
  })

  it("rejects cross-origin requests", async () => {
    const result = validateTrustedOrigin(
      makeRequest({
        origin: "https://evil.example",
      }) as any
    )

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.response.status).toBe(403)
      await expect(result.response.json()).resolves.toEqual({
        message: "Cross-origin state-changing request rejected.",
      })
    }
  })

  it("rejects requests missing both origin and referer", async () => {
    const result = validateTrustedOrigin(makeRequest() as any)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.response.status).toBe(403)
      await expect(result.response.json()).resolves.toEqual({
        message: "Missing trusted origin for state-changing request.",
      })
    }
  })

  it("accepts same-origin server action requests via forwarded host and proto", () => {
    const headers = makeHeaders({
      origin: "https://store.example",
      forwardedHost: "store.example",
      forwardedProto: "https",
    })

    expect(getServerActionRequestOrigin(headers)).toBe("https://store.example")
    expect(
      validateTrustedOriginHeaders(headers, getServerActionRequestOrigin(headers))
    ).toEqual({ ok: true })
  })

  it("accepts same-origin server action requests via referer fallback", () => {
    const headers = makeHeaders({
      referer: "https://store.example/en/account/profile",
      host: "store.example",
    })

    expect(getServerActionRequestOrigin(headers)).toBe("https://store.example")
    expect(
      validateTrustedOriginHeaders(headers, getServerActionRequestOrigin(headers))
    ).toEqual({ ok: true })
  })

  it("rejects cross-origin server action requests", () => {
    const headers = makeHeaders({
      origin: "https://evil.example",
      forwardedHost: "store.example",
      forwardedProto: "https",
    })

    expect(
      validateTrustedOriginHeaders(headers, getServerActionRequestOrigin(headers))
    ).toEqual({
      ok: false,
      message: "Cross-origin state-changing request rejected.",
    })
  })

  it("rejects server action requests missing origin and referer", () => {
    const headers = makeHeaders({
      forwardedHost: "store.example",
      forwardedProto: "https",
    })

    expect(
      validateTrustedOriginHeaders(headers, getServerActionRequestOrigin(headers))
    ).toEqual({
      ok: false,
      message: "Missing trusted origin for state-changing request.",
    })
  })
})