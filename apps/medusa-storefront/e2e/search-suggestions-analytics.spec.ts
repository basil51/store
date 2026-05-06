import { expect, test } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"

type SearchAnalyticsEnvelope = {
  event_name: string
  payload: Record<string, unknown>
}

test.describe("Phase 15 nav search analytics", () => {
  test("emits one normalized nav search_submitted event on explicit form submit", async ({
    page,
  }) => {
    const rawQuery = "  x  "
    const normalizedQuery = "x"
    const analyticsEvents: SearchAnalyticsEnvelope[] = []

    await page.route("**/api/analytics/search", async (route) => {
      analyticsEvents.push(
        JSON.parse(route.request().postData() ?? "{}") as SearchAnalyticsEnvelope
      )

      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true }),
      })
    })

    await page.goto(`/${DEFAULT_COUNTRY_CODE}`, { waitUntil: "domcontentloaded" })

    const searchInput = page.locator('input[type="search"][name="q"]').first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(rawQuery)
    await searchInput.press("Enter")

    await expect(page).toHaveURL(new RegExp(`/${DEFAULT_COUNTRY_CODE}/store\\?`))
    await expect.poll(() => analyticsEvents.length).toBe(1)

    expect(analyticsEvents[0]).toMatchObject({
      event_name: "search_submitted",
      payload: {
        query: normalizedQuery,
        source: "nav",
      },
    })
    expect(analyticsEvents[0]?.payload).not.toHaveProperty("result_count")
  })

  test("emits a no-suggestions view event when the nav dropdown has no quick matches", async ({
    page,
  }) => {
    const query = `nav-no-hit-${Date.now().toString(36)}`
    const analyticsEvents: SearchAnalyticsEnvelope[] = []

    await page.route("**/api/search/suggestions?*", async (route) => {
      const requestUrl = new URL(route.request().url())

      if (requestUrl.searchParams.get("q") !== query) {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          suggestions: [],
          recovered_query: null,
        }),
      })
    })

    await page.route("**/api/analytics/search", async (route) => {
      analyticsEvents.push(
        JSON.parse(route.request().postData() ?? "{}") as SearchAnalyticsEnvelope
      )

      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true }),
      })
    })

    await page.goto(`/${DEFAULT_COUNTRY_CODE}`, { waitUntil: "domcontentloaded" })

    const searchInput = page.locator('input[type="search"][name="q"]').first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(query)

    const suggestionsPanel = page.locator("#nav-search-suggestions")
    await expect(suggestionsPanel).toBeVisible()
    await expect(suggestionsPanel).toContainText("No quick suggestions yet")

    await expect.poll(() => analyticsEvents.length).toBe(1)

    expect(analyticsEvents[0]).toMatchObject({
      event_name: "search_results_viewed",
      payload: {
        query,
        result_count: 0,
        country_code: DEFAULT_COUNTRY_CODE,
        source: "nav",
      },
    })
    expect(analyticsEvents[0]?.payload).not.toHaveProperty("recovered_query")
  })

  test("emits original and recovered nav view events when quick suggestions recover the query", async ({
    page,
  }) => {
    const query = `nav-recovery-${Date.now().toString(36)}`
    const recoveredQuery = "Monitor Stand"
    const analyticsEvents: SearchAnalyticsEnvelope[] = []

    await page.route("**/api/search/suggestions?*", async (route) => {
      const requestUrl = new URL(route.request().url())

      if (requestUrl.searchParams.get("q") !== query) {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          suggestions: [
            {
              id: "prod_monitor_stand",
              title: recoveredQuery,
              handle: "monitor-stand",
              thumbnail: null,
            },
          ],
          recovered_query: recoveredQuery,
          recovery_source: "analytics",
        }),
      })
    })

    await page.route("**/api/analytics/search", async (route) => {
      analyticsEvents.push(
        JSON.parse(route.request().postData() ?? "{}") as SearchAnalyticsEnvelope
      )

      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true }),
      })
    })

    await page.goto(`/${DEFAULT_COUNTRY_CODE}`, { waitUntil: "domcontentloaded" })

    const searchInput = page.locator('input[type="search"][name="q"]').first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(query)

    const suggestionsPanel = page.locator("#nav-search-suggestions")
    await expect(suggestionsPanel).toBeVisible()
    await expect(suggestionsPanel).toContainText(`Suggestions for "${recoveredQuery}"`)
    await expect(suggestionsPanel).toContainText(recoveredQuery)

    await expect.poll(() => analyticsEvents.length).toBe(2)

    const [originalEvent, recoveredEvent] = analyticsEvents

    expect(originalEvent).toMatchObject({
      event_name: "search_results_viewed",
      payload: {
        query,
        result_count: 0,
        country_code: DEFAULT_COUNTRY_CODE,
        source: "nav",
        recovered_query: recoveredQuery,
      },
    })

    expect(recoveredEvent).toMatchObject({
      event_name: "search_results_viewed",
      payload: {
        query: recoveredQuery,
        result_count: 1,
        country_code: DEFAULT_COUNTRY_CODE,
        source: "nav",
        recovery_source: "analytics",
        recovered_from_query: query,
        original_result_count: 0,
      },
    })
  })
})