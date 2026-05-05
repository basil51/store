import { expect, test, type Page } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"

const flattenStructuredData = (entries: unknown[]): Array<Record<string, unknown>> =>
  entries.flatMap((entry) => {
    if (Array.isArray(entry)) {
      return flattenStructuredData(entry)
    }

    if (!entry || typeof entry !== "object") {
      return []
    }

    return [entry as Record<string, unknown>]
  })

const getStructuredData = async (page: Page) => {
  const payloads = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => {
        const content = script.textContent ?? ""

        try {
          return JSON.parse(content)
        } catch {
          return null
        }
      })
    )

  return flattenStructuredData(payloads).filter(Boolean)
}

const expectStructuredDataTypes = async (page: Page, types: string[]) => {
  const structuredData = await getStructuredData(page)
  const renderedTypes = structuredData
    .map((entry) => entry["@type"])
    .filter((value): value is string => typeof value === "string")

  expect(renderedTypes.length).toBeGreaterThan(0)

  for (const type of types) {
    expect(renderedTypes).toContain(type)
  }
}

const openAnyProductPage = async (page: Page, countryCode: string) => {
  for (const path of [`/${countryCode}/store`, `/${countryCode}`]) {
    await page.goto(path, { waitUntil: "domcontentloaded" })

    const productLinks = page.locator(`a[href*="/${countryCode}/products/"]`)

    if ((await productLinks.count()) === 0) {
      continue
    }

    await productLinks.first().click()
    return
  }

  throw new Error(`No product links were found for country code ${countryCode}.`)
}

test.describe("Phase 14 SEO structured data", () => {
  test("renders JSON-LD on key public pages", async ({ page }) => {
    await page.goto(`/${DEFAULT_COUNTRY_CODE}`, { waitUntil: "domcontentloaded" })
    await expectStructuredDataTypes(page, ["WebSite", "Organization"])

    await page.goto(`/${DEFAULT_COUNTRY_CODE}/store`, {
      waitUntil: "domcontentloaded",
    })
    await expectStructuredDataTypes(page, ["BreadcrumbList", "CollectionPage"])

    await page.goto(`/${DEFAULT_COUNTRY_CODE}/collections`, {
      waitUntil: "domcontentloaded",
    })
    await expectStructuredDataTypes(page, [
      "BreadcrumbList",
      "CollectionPage",
      "ItemList",
    ])

    await openAnyProductPage(page, DEFAULT_COUNTRY_CODE)
    await expect(page).toHaveURL(new RegExp(`/${DEFAULT_COUNTRY_CODE}/products/`))
    await expectStructuredDataTypes(page, ["BreadcrumbList", "Product"])
  })
})