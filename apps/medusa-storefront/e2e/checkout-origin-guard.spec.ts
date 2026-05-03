import { expect, test, type Page } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"

type CapturedServerActionRequest = {
  url: string
  nextAction: string
  contentType: string
  accept: string
  postData: string
}

const selectFirstVariantOptions = async (page: Page) => {
  const optionGroups = page.getByTestId("product-options")
  const optionGroupCount = await optionGroups.count()

  for (let i = 0; i < optionGroupCount; i += 1) {
    const optionButtons = optionGroups.nth(i).getByTestId("option-button")

    if ((await optionButtons.count()) > 0) {
      await optionButtons.first().click()
    }
  }
}

const captureAddToCartServerAction = async (
  page: Page,
  countryCode: string
): Promise<CapturedServerActionRequest> => {
  await page.goto(`/${countryCode}`, { waitUntil: "domcontentloaded" })

  const productPaths = await page
    .locator(`a[href*="/${countryCode}/products/"]`)
    .evaluateAll((anchors) => {
      return Array.from(
        new Set(
          anchors
            .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href"))
            .filter((href): href is string => Boolean(href))
        )
      )
    })

  if (!productPaths.length) {
    throw new Error(`No product links found under /${countryCode}/products/`)
  }

  for (const productPath of productPaths.slice(0, 12)) {
    await page.goto(productPath, { waitUntil: "domcontentloaded" })

    const addButton = page.getByTestId("add-product-button")

    if ((await addButton.count()) === 0) {
      continue
    }

    await selectFirstVariantOptions(page)

    if (!(await addButton.isEnabled())) {
      continue
    }

    const capturedRequestPromise = page.waitForRequest((request) => {
      const headers = request.headers()

      return (
        request.method() === "POST" &&
        Boolean(headers["next-action"]) &&
        request.url().includes(`/products/`)
      )
    })

    await addButton.click()

    const request = await capturedRequestPromise
    const headers = request.headers()
    const postData = request.postData()

    if (!headers["next-action"] || !postData) {
      throw new Error("Captured add-to-cart server action request was incomplete.")
    }

    return {
      url: request.url(),
      nextAction: headers["next-action"],
      contentType: headers["content-type"] ?? "text/plain;charset=UTF-8",
      accept: headers["accept"] ?? "text/x-component",
      postData,
    }
  }

  throw new Error("Could not capture an add-to-cart server action request.")
}

test("rejects cross-origin add-to-cart server action replays", async ({
  page,
  request,
}) => {
  const capturedRequest = await captureAddToCartServerAction(
    page,
    DEFAULT_COUNTRY_CODE
  )

  const forgedResponse = await request.post(capturedRequest.url, {
    headers: {
      accept: capturedRequest.accept,
      "content-type": capturedRequest.contentType,
      "next-action": capturedRequest.nextAction,
      origin: "https://evil.example",
      referer: "https://evil.example/cart",
    },
    data: capturedRequest.postData,
  })

  expect(forgedResponse.status()).toBeGreaterThanOrEqual(400)
  await expect(forgedResponse.text()).resolves.toMatch(
    /Invalid Server Actions request\.|Cross-origin state-changing request rejected\./
  )
})