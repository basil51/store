import { expect, test, type Page } from "@playwright/test"
import { Client } from "pg"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"

const normalizeQuery = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 255)

const createDbClient = () =>
  new Client({
    host: process.env.PLAYWRIGHT_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.PLAYWRIGHT_DB_PORT ?? "5433"),
    user: process.env.PLAYWRIGHT_DB_USER ?? "medusa",
    password: process.env.PLAYWRIGHT_DB_PASSWORD ?? "medusa",
    database: process.env.PLAYWRIGHT_DB_NAME ?? "medusa",
  })

const ensureRecoveryOverrideTable = async (client: Client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS search_recovery_overrides (
      id BIGSERIAL PRIMARY KEY,
      query VARCHAR(255) NOT NULL,
      normalized_query VARCHAR(255) NOT NULL,
      target_query VARCHAR(255) NOT NULL,
      target_normalized_query VARCHAR(255) NOT NULL,
      locale VARCHAR(16) NULL,
      country_code VARCHAR(16) NULL,
      note VARCHAR(512) NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_search_recovery_override_query
      ON search_recovery_overrides (normalized_query)`
  )
  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_search_recovery_override_scope
      ON search_recovery_overrides (locale, country_code)`
  )
}

const discoverAnyProduct = async (page: Page, countryCode: string) => {
  for (const path of [`/${countryCode}/store`, `/${countryCode}`]) {
    await page.goto(path, { waitUntil: "domcontentloaded" })

    const productCards = page.locator('[data-testid="product-wrapper"]')

    if ((await productCards.count()) === 0) {
      continue
    }

    const firstCard = productCards.first()
    const title = (await firstCard
      .locator('[data-testid="product-title"]')
      .innerText())
      .replace(/\s+/g, " ")
      .trim()

    if (title) {
      return { title }
    }
  }

  throw new Error(`No storefront product cards were found for ${countryCode}.`)
}

type SearchAnalyticsEnvelope = {
  event_name: string
  payload: Record<string, unknown>
}

const captureSearchAnalytics = async (page: Page) => {
  const events: SearchAnalyticsEnvelope[] = []

  await page.route("**/api/analytics/search", async (route) => {
    const body = route.request().postData() ?? "{}"
    events.push(JSON.parse(body) as SearchAnalyticsEnvelope)

    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true }),
    })
  })

  return events
}

test.describe("Phase 15 search results analytics", () => {
  test("emits one empty-results view event for a no-hit store search", async ({ page }) => {
    const analyticsEvents = await captureSearchAnalytics(page)
    const query = `zzqx-phase15-${Date.now().toString(36)}-nohit`

    await page.goto(
      `/${DEFAULT_COUNTRY_CODE}/store?q=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded" }
    )

    await expect(page.getByText(`No matches for "${query}"`)).toBeVisible()
    await expect.poll(() => analyticsEvents.length).toBe(1)

    expect(analyticsEvents[0]).toMatchObject({
      event_name: "search_results_viewed",
      payload: {
        query,
        result_count: 0,
        country_code: DEFAULT_COUNTRY_CODE,
        source: "store",
      },
    })
    expect(analyticsEvents[0]?.payload).not.toHaveProperty("recovered_query")
  })

  test("emits original and recovered view events for a recovered store search", async ({
    page,
  }) => {
    const analyticsEvents = await captureSearchAnalytics(page)
    const db = createDbClient()
    await db.connect()

    const originalQuery = `phase15 analytics ${Date.now()}`

    try {
      const product = await discoverAnyProduct(page, DEFAULT_COUNTRY_CODE)
      const recoveredQuery = product.title

      await ensureRecoveryOverrideTable(db)
      await db.query(
        `
          INSERT INTO search_recovery_overrides (
            query,
            normalized_query,
            target_query,
            target_normalized_query,
            note
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          originalQuery,
          normalizeQuery(originalQuery),
          recoveredQuery,
          normalizeQuery(recoveredQuery),
          "phase15 playwright search analytics coverage",
        ]
      )

      await page.goto(
        `/${DEFAULT_COUNTRY_CODE}/store?q=${encodeURIComponent(originalQuery)}`,
        { waitUntil: "domcontentloaded" }
      )

      await expect(
        page.getByText(`No direct matches for "${originalQuery}"`)
      ).toBeVisible()
      await expect.poll(() => analyticsEvents.length).toBe(2)

      const [originalEvent, recoveredEvent] = analyticsEvents

      expect(originalEvent).toMatchObject({
        event_name: "search_results_viewed",
        payload: {
          query: originalQuery,
          result_count: 0,
          country_code: DEFAULT_COUNTRY_CODE,
          source: "store",
          recovered_query: recoveredQuery,
        },
      })

      expect(recoveredEvent?.event_name).toBe("search_results_viewed")
      expect(recoveredEvent?.payload).toMatchObject({
        query: recoveredQuery,
        country_code: DEFAULT_COUNTRY_CODE,
        source: "store_recovery",
        recovery_source: "override",
        recovered_from_query: originalQuery,
        original_result_count: 0,
      })
      expect(Number(recoveredEvent?.payload?.result_count ?? 0)).toBeGreaterThan(0)
    } finally {
      await db.query(
        `DELETE FROM search_recovery_overrides WHERE normalized_query = $1`,
        [normalizeQuery(originalQuery)]
      )
      await db.end()
    }
  })

  test("emits a direct store-results view event after clicking the recovered-results CTA", async ({
    page,
  }) => {
    const analyticsEvents = await captureSearchAnalytics(page)
    const db = createDbClient()
    await db.connect()

    const originalQuery = `phase15 analytics cta ${Date.now()}`

    try {
      const product = await discoverAnyProduct(page, DEFAULT_COUNTRY_CODE)
      const recoveredQuery = product.title

      await ensureRecoveryOverrideTable(db)
      await db.query(
        `
          INSERT INTO search_recovery_overrides (
            query,
            normalized_query,
            target_query,
            target_normalized_query,
            note
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          originalQuery,
          normalizeQuery(originalQuery),
          recoveredQuery,
          normalizeQuery(recoveredQuery),
          "phase15 playwright search analytics cta coverage",
        ]
      )

      await page.goto(
        `/${DEFAULT_COUNTRY_CODE}/store?q=${encodeURIComponent(originalQuery)}`,
        { waitUntil: "domcontentloaded" }
      )

      const recoveredResultsLink = page.getByRole("link", {
        name: `Search for "${recoveredQuery}" directly`,
      })

      await expect(recoveredResultsLink).toBeVisible()
      await expect.poll(() => analyticsEvents.length).toBe(2)

      await recoveredResultsLink.click()

      await expect
        .poll(() => {
          const url = new URL(page.url())

          return {
            pathname: url.pathname,
            query: url.searchParams.get("q"),
          }
        })
        .toEqual({
          pathname: `/${DEFAULT_COUNTRY_CODE}/store`,
          query: recoveredQuery,
        })
      await expect.poll(() => analyticsEvents.length).toBe(3)

      const directResultsEvent = analyticsEvents[2]

      expect(directResultsEvent?.event_name).toBe("search_results_viewed")
      expect(directResultsEvent?.payload).toMatchObject({
        query: recoveredQuery,
        country_code: DEFAULT_COUNTRY_CODE,
        source: "store",
      })
      expect(Number(directResultsEvent?.payload?.result_count ?? 0)).toBeGreaterThan(0)
      expect(directResultsEvent?.payload).not.toHaveProperty("recovered_query")
      expect(directResultsEvent?.payload).not.toHaveProperty("recovery_source")
      expect(directResultsEvent?.payload).not.toHaveProperty("recovered_from_query")
    } finally {
      await db.query(
        `DELETE FROM search_recovery_overrides WHERE normalized_query = $1`,
        [normalizeQuery(originalQuery)]
      )
      await db.end()
    }
  })
})