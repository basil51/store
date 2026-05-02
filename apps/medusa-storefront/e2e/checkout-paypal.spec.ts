import { expect, test, type Locator, type Page } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"
const DEFAULT_FIRST_NAME = "PayPal"
const DEFAULT_LAST_NAME = "Tester"
const DEFAULT_ADDRESS_LINE = "9 Sandbox Street"
const DEFAULT_POSTAL_CODE = "61000"
const DEFAULT_CITY = "Haifa"
const DEFAULT_PHONE = "+972501234567"
const DEFAULT_EMAIL = "checkout-paypal-path@example.com"

const stepFromUrl = (url: string) => new URL(url).searchParams.get("step")

const hasCartCookie = async (page: Page) => {
  const cookies = await page.context().cookies()
  return cookies.some((cookie) => cookie.name.startsWith("_medusa_cart_id"))
}

const selectFirstVariantOptions = async (page: Page) => {
  const optionGroups = page.getByTestId("product-options")
  const optionGroupCount = await optionGroups.count()

  for (let index = 0; index < optionGroupCount; index += 1) {
    const optionButtons = optionGroups.nth(index).getByTestId("option-button")

    if ((await optionButtons.count()) > 0) {
      await optionButtons.first().click()
    }
  }
}

const addAnySellableProductToCart = async (page: Page, countryCode: string) => {
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

    await addButton.click()

    try {
      await expect
        .poll(async () => hasCartCookie(page), { timeout: 12_000 })
        .toBe(true)

      return
    } catch {
      // Try another product if the cart cookie is not created for this one.
    }
  }

  throw new Error("Could not add any discovered product to cart.")
}

const fillAndAssertValue = async (locator: Locator, value: string) => {
  await expect(locator).toBeVisible()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await locator.click()
    await locator.fill(value)

    try {
      await expect(locator).toHaveValue(value, { timeout: 3_000 })
      return
    } catch (error) {
      if (attempt === 2) {
        throw error
      }
    }
  }
}

const completeAddressStep = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}/checkout?step=address`, {
    waitUntil: "domcontentloaded",
  })

  await fillAndAssertValue(
    page.getByTestId("shipping-first-name-input"),
    DEFAULT_FIRST_NAME
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-last-name-input"),
    DEFAULT_LAST_NAME
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-address-input"),
    DEFAULT_ADDRESS_LINE
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-postal-code-input"),
    DEFAULT_POSTAL_CODE
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-city-input"),
    DEFAULT_CITY
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-province-input"),
    DEFAULT_CITY
  )
  await page.getByTestId("shipping-country-select").selectOption(countryCode)
  await expect(page.getByTestId("shipping-country-select")).toHaveValue(countryCode)
  await fillAndAssertValue(
    page.getByTestId("shipping-email-input"),
    DEFAULT_EMAIL
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-phone-input"),
    DEFAULT_PHONE
  )

  await page.getByTestId("submit-address-button").click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("delivery")
}

const completeDeliveryStep = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}/checkout?step=delivery`, {
    waitUntil: "domcontentloaded",
  })

  const deliveryOptions = page.getByTestId("delivery-option-radio")
  const submitButton = page.getByTestId("submit-delivery-option-button")

  await expect
    .poll(async () => deliveryOptions.count(), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await expect
    .poll(async () => {
      await deliveryOptions.first().focus()
      await deliveryOptions.first().press("Space")

      return submitButton.isEnabled()
    }, { timeout: 20_000 })
    .toBe(true)

  await submitButton.click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("payment")
}

const getPaymentMethodLabels = async (page: Page) => {
  return page.getByRole("radio").evaluateAll((nodes) => {
    return nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
  })
}

const continueWithPayPal = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}/checkout?step=payment`, {
    waitUntil: "domcontentloaded",
  })

  await expect
    .poll(async () => (await page.getByRole("radio").count()) > 0, {
      timeout: 15_000,
    })
    .toBe(true)

  const paymentMethodLabels = await getPaymentMethodLabels(page)
  const payPalIndex = paymentMethodLabels.findIndex((label) => /paypal/i.test(label))

  test.skip(
    payPalIndex === -1,
    `PayPal is not exposed in checkout. Available methods: ${paymentMethodLabels.join(", ") || "none"}`
  )

  const paypalPaymentCard = page.getByRole("radio").nth(payPalIndex)
  const submitPaymentButton = page.getByTestId("submit-payment-button")

  await expect(paypalPaymentCard).toBeVisible()

  await expect
    .poll(async () => {
      await paypalPaymentCard.click()

      return [
        await paypalPaymentCard.getAttribute("aria-checked"),
        String(await submitPaymentButton.isEnabled()),
        (await submitPaymentButton.textContent())?.trim() ?? "",
      ].join("|")
    }, { timeout: 20_000 })
    .toBe("true|true|Continue to review")

  await submitPaymentButton.click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("review")
}

test.describe("Checkout PayPal path", () => {
  test("reaches review with PayPal selected and renders the PayPal button", async ({
    page,
  }) => {
    test.setTimeout(240_000)

    const countryCode = DEFAULT_COUNTRY_CODE

    await addAnySellableProductToCart(page, countryCode)
    await completeAddressStep(page, countryCode)
    await completeDeliveryStep(page, countryCode)
    await continueWithPayPal(page, countryCode)

    await expect(page.getByTestId("review-payment-summary-strip")).toContainText(
      "PayPal"
    )

    const payPalButtonRoot = page.getByTestId("submit-order-button")
    await expect(payPalButtonRoot).toBeVisible()
    await expect(
      payPalButtonRoot.locator("iframe").first()
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("paypal-payment-error-message")).toHaveCount(0)
  })
})