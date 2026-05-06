import { expect, test } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"

const createNoHitQuery = () =>
  `zzqxnvkprtmw${Date.now().toString(36)}zz`

test.describe("Phase 15 empty search results page", () => {
  test("renders the no-results empty state when search has no direct or recovered matches", async ({
    page,
  }) => {
    const query = createNoHitQuery()

    await page.goto(
      `/${DEFAULT_COUNTRY_CODE}/store?q=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded" }
    )

    await expect(page.getByTestId("store-page-title")).toContainText(query)
    await expect(page.getByText(`No matches for "${query}"`)).toBeVisible()
    await expect(
      page.getByText("Try broader keywords, a brand name, or browse the catalog instead.")
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Clear search" })
    ).toHaveAttribute("href", `/${DEFAULT_COUNTRY_CODE}/store`)

    await expect(
      page.getByText(new RegExp(`No direct matches for \"${query}\"`))
    ).toHaveCount(0)
    await expect(
      page.locator('[data-testid="products-list"] [data-testid="product-wrapper"]')
    ).toHaveCount(0)
  })
})