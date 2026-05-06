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
    const href = await firstCard.evaluate((element) =>
      element.parentElement?.getAttribute("href") ?? null
    )

    if (title && href) {
      return { title, href }
    }
  }

  throw new Error(`No storefront product cards were found for ${countryCode}.`)
}

test.describe("Phase 15 recovered store results page", () => {
  test("renders recovered results and recovery messaging for a zero-result query", async ({
    page,
  }) => {
    const db = createDbClient()
    await db.connect()

    const originalQuery = `phase15 recovery ${Date.now()}`

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
          "phase15 playwright recovered results coverage",
        ]
      )

      await page.goto(
        `/${DEFAULT_COUNTRY_CODE}/store?q=${encodeURIComponent(originalQuery)}`,
        { waitUntil: "domcontentloaded" }
      )

      await expect(page.getByTestId("store-page-title")).toContainText(originalQuery)
      await expect(page.getByText(`No direct matches for "${originalQuery}"`)).toBeVisible()
      await expect(
        page.getByText(`Showing results for "${recoveredQuery}" based on similar shopper searches.`)
      ).toBeVisible()

      const recoveredResultsLink = page.getByRole("link", {
        name: `Search for "${recoveredQuery}" directly`,
      })

      await expect(recoveredResultsLink).toHaveAttribute(
        "href",
        `/${DEFAULT_COUNTRY_CODE}/store?q=${encodeURIComponent(recoveredQuery)}`
      )
      await expect(
        page.locator(`[data-testid="products-list"] a[href="${product.href}"]`).first()
      ).toBeVisible()
    } finally {
      await db.query(
        `DELETE FROM search_recovery_overrides WHERE normalized_query = $1`,
        [normalizeQuery(originalQuery)]
      )
      await db.end()
    }
  })
})