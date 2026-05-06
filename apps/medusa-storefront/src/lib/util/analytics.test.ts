import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  trackSearchResultsViewed,
  trackSearchSubmitted,
} from "./analytics"

const FIXED_TIMESTAMP = "2026-05-06T12:34:56.000Z"

const mocks = vi.hoisted(() => ({
  dispatchEvent: vi.fn(),
  fetch: vi.fn(),
  gtag: vi.fn(),
}))

const originalFetch = globalThis.fetch
const originalWindow = (globalThis as typeof globalThis & { window?: Window }).window
const originalCustomEvent = globalThis.CustomEvent

class CustomEventStub<T = unknown> {
  type: string
  detail: T

  constructor(type: string, init?: { detail?: T }) {
    this.type = type
    this.detail = init?.detail as T
  }
}

const getPostedAnalyticsBody = () => {
  const requestInit = mocks.fetch.mock.calls[0]?.[1] as RequestInit | undefined

  return {
    requestInit,
    parsedBody: JSON.parse(String(requestInit?.body ?? "{}")) as {
      event_name: string
      payload: Record<string, unknown>
    },
  }
}

describe("search analytics client helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_TIMESTAMP))

    mocks.fetch.mockResolvedValue({ ok: true })

    vi.stubGlobal("fetch", mocks.fetch)
    vi.stubGlobal("CustomEvent", CustomEventStub)
    vi.stubGlobal("window", {
      dispatchEvent: mocks.dispatchEvent,
      dataLayer: [],
      gtag: mocks.gtag,
    })

    vi.spyOn(console, "debug").mockImplementation(() => {})
  })

  afterAll(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch

    if (originalWindow) {
      vi.stubGlobal("window", originalWindow)
    }

    if (originalCustomEvent) {
      vi.stubGlobal("CustomEvent", originalCustomEvent)
    }
  })

  it("wraps search_submitted with occurred_at and posts it to the search sink", () => {
    trackSearchSubmitted({
      query: "gaming laptop",
      locale: "en",
      source: "nav",
    })

    expect(mocks.dispatchEvent).toHaveBeenCalledTimes(1)
    expect(mocks.dispatchEvent.mock.calls[0]?.[0]).toMatchObject({
      type: "nexmart:analytics",
      detail: {
        event: "search_submitted",
        query: "gaming laptop",
        locale: "en",
        source: "nav",
        occurred_at: FIXED_TIMESTAMP,
        timestamp: FIXED_TIMESTAMP,
      },
    })

    const windowStub = globalThis.window as Window & {
      dataLayer: Array<Record<string, unknown>>
    }
    expect(windowStub.dataLayer).toEqual([
      {
        event: "search_submitted",
        query: "gaming laptop",
        locale: "en",
        source: "nav",
        occurred_at: FIXED_TIMESTAMP,
        timestamp: FIXED_TIMESTAMP,
      },
    ])
    expect(mocks.gtag).toHaveBeenCalledWith("event", "search_submitted", {
      query: "gaming laptop",
      locale: "en",
      source: "nav",
      occurred_at: FIXED_TIMESTAMP,
    })
    expect(mocks.fetch).toHaveBeenCalledWith("/api/analytics/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "include",
      keepalive: true,
      body: expect.any(String),
    })

    const { parsedBody } = getPostedAnalyticsBody()

    expect(parsedBody).toEqual({
      event_name: "search_submitted",
      payload: {
        occurred_at: FIXED_TIMESTAMP,
        query: "gaming laptop",
        locale: "en",
        source: "nav",
      },
    })
  })

  it("wraps search_results_viewed recovery payloads and preserves recovery metadata", () => {
    trackSearchResultsViewed({
      query: "Monitor Stand",
      locale: "en",
      country_code: "il",
      result_count: 3,
      source: "store_recovery",
      recovery_source: "analytics",
      recovered_from_query: "monitro stand",
      original_result_count: 0,
    })

    expect(mocks.dispatchEvent).toHaveBeenCalledTimes(1)
    expect(mocks.dispatchEvent.mock.calls[0]?.[0]).toMatchObject({
      type: "nexmart:analytics",
      detail: {
        event: "search_results_viewed",
        query: "Monitor Stand",
        locale: "en",
        country_code: "il",
        result_count: 3,
        source: "store_recovery",
        recovery_source: "analytics",
        recovered_from_query: "monitro stand",
        original_result_count: 0,
        occurred_at: FIXED_TIMESTAMP,
        timestamp: FIXED_TIMESTAMP,
      },
    })

    expect(mocks.gtag).toHaveBeenCalledWith("event", "search_results_viewed", {
      query: "Monitor Stand",
      locale: "en",
      country_code: "il",
      result_count: 3,
      source: "store_recovery",
      recovery_source: "analytics",
      recovered_from_query: "monitro stand",
      original_result_count: 0,
      occurred_at: FIXED_TIMESTAMP,
    })
    expect(mocks.fetch).toHaveBeenCalledWith("/api/analytics/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "include",
      keepalive: true,
      body: expect.any(String),
    })

    const { parsedBody } = getPostedAnalyticsBody()

    expect(parsedBody).toEqual({
      event_name: "search_results_viewed",
      payload: {
        occurred_at: FIXED_TIMESTAMP,
        query: "Monitor Stand",
        locale: "en",
        country_code: "il",
        result_count: 3,
        source: "store_recovery",
        recovery_source: "analytics",
        recovered_from_query: "monitro stand",
        original_result_count: 0,
      },
    })
  })
})