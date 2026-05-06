import { expect, test } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"

test.describe("Phase 15 recovered search flow", () => {
  test("renders recovered suggestions in nav search and routes CTA to the recovered query", async ({
    page,
  }) => {
    const typoQuery = "monitro stand"
    const recoveredQuery = "monitor stand"

    await page.route("**/api/search/suggestions?*", async (route) => {
      const requestUrl = new URL(route.request().url())

      if (requestUrl.searchParams.get("q") !== typoQuery) {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          suggestions: [
            {
              id: "prod_recovered_1",
              title: "Monitor Stand Pro",
              handle: "monitor-stand-pro",
              thumbnail: null,
            },
          ],
          recovered_query: recoveredQuery,
        }),
      })
    })

    await page.goto(`/${DEFAULT_COUNTRY_CODE}`, { waitUntil: "domcontentloaded" })

    const searchInput = page.locator('input[type="search"][name="q"]').first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(typoQuery)

    const suggestionsPanel = page.locator("#nav-search-suggestions")
    await expect(suggestionsPanel).toBeVisible()
    await expect(suggestionsPanel).toContainText(recoveredQuery)
    await expect(
      suggestionsPanel.getByRole("link", { name: "Monitor Stand Pro" })
    ).toHaveAttribute(
      "href",
      `/${DEFAULT_COUNTRY_CODE}/products/monitor-stand-pro`
    )

    const recoveredResultsLink = suggestionsPanel
      .getByRole("link")
      .last()

    await expect(recoveredResultsLink).toHaveAttribute(
      "href",
      `/${DEFAULT_COUNTRY_CODE}/store?q=${encodeURIComponent(recoveredQuery)}`
    )

    await recoveredResultsLink.click()

    await expect(page).toHaveURL(
      new RegExp(`/${DEFAULT_COUNTRY_CODE}/store\\?q=${encodeURIComponent(recoveredQuery)}`)
    )
  })
})