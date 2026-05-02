import { expect, test, type Locator, type Page } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"
const MANUAL_PAYMENT_LABEL = "Cash / offline payment"
const DEFAULT_FIRST_NAME = "Happy"
const DEFAULT_LAST_NAME = "Path"
const DEFAULT_ADDRESS_LINE = "9 Confirmation Street"
const DEFAULT_POSTAL_CODE = "61000"
const DEFAULT_CITY = "Haifa"
const DEFAULT_PHONE = "+972501234567"
const DEFAULT_EMAIL = "checkout-happy-path@example.com"

const stepFromUrl = (url: string) => new URL(url).searchParams.get("step")

const parseAmountFromLabel = (label: string) => {
  const amountMatch = label.match(/([0-9][\d,]*(?:\.\d+)?)(?!.*[0-9])/)?.[1]

  if (!amountMatch) {
    throw new Error(`Could not parse an amount from label: ${label}`)
  }

  return Number(amountMatch.replace(/,/g, ""))
}

const hasCartCookie = async (page: Page) => {
  const cookies = await page.context().cookies()
  return cookies.some((cookie) => cookie.name.startsWith("_medusa_cart_id"))
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
      // Continue trying other products if the current one does not create a usable cart.
    }
  }

  throw new Error("Could not add any discovered product to cart.")
}

const trackCheckoutErrors = (page: Page) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedResponses: { status: number; url: string }[] = []

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text())
    }
  })

  page.on("pageerror", (error) => {
    pageErrors.push(error.message)
  })

  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      /checkout|cart|payment|shipping|store/.test(response.url())
    ) {
      failedResponses.push({ status: response.status(), url: response.url() })
    }
  })

  return {
    consoleErrors,
    pageErrors,
    failedResponses,
  }
}

type AddressFormValues = {
  firstName?: string
  lastName?: string
  addressLine?: string
  postalCode?: string
  city?: string
  province?: string
  phone?: string
  email?: string
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

const fillAddressForm = async (
  page: Page,
  countryCode: string,
  values: AddressFormValues = {}
) => {
  await fillAndAssertValue(
    page.getByTestId("shipping-first-name-input"),
    values.firstName ?? DEFAULT_FIRST_NAME
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-last-name-input"),
    values.lastName ?? DEFAULT_LAST_NAME
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-address-input"),
    values.addressLine ?? DEFAULT_ADDRESS_LINE
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-postal-code-input"),
    values.postalCode ?? DEFAULT_POSTAL_CODE
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-city-input"),
    values.city ?? DEFAULT_CITY
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-province-input"),
    values.province ?? values.city ?? DEFAULT_CITY
  )
  await page.getByTestId("shipping-country-select").selectOption(countryCode)
  await expect(page.getByTestId("shipping-country-select")).toHaveValue(countryCode)
  await fillAndAssertValue(
    page.getByTestId("shipping-email-input"),
    values.email ?? DEFAULT_EMAIL
  )
  await fillAndAssertValue(
    page.getByTestId("shipping-phone-input"),
    values.phone ?? DEFAULT_PHONE
  )
}

const completeAddressStep = async (
  page: Page,
  countryCode: string,
  values: AddressFormValues = {}
) => {
  await page.goto(`/${countryCode}/checkout?step=address`, {
    waitUntil: "domcontentloaded",
  })

  await fillAddressForm(page, countryCode, values)

  await page.getByTestId("submit-address-button").click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("delivery")
}

const getDeliveryOptionLabel = async (page: Page, optionIndex: number) => {
  const selectedOption = page.getByTestId("delivery-option-radio").nth(optionIndex)
  const selectedLabel = ((await selectedOption.textContent()) ?? "")
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean)

  if (!selectedLabel) {
    throw new Error(`Could not read the label for delivery option index ${optionIndex}.`)
  }

  return selectedLabel
}

const selectDeliveryOptionAndContinue = async (
  page: Page,
  optionIndex = 0
) => {
  const deliveryOptions = page.getByTestId("delivery-option-radio")
  const submitButton = page.getByTestId("submit-delivery-option-button")

  await expect
    .poll(async () => deliveryOptions.count(), { timeout: 15_000 })
    .toBeGreaterThan(optionIndex)

  const optionCount = await deliveryOptions.count()

  if (optionCount === 0) {
    throw new Error("No delivery options were rendered for checkout.")
  }

  if (optionCount <= optionIndex) {
    throw new Error(
      `Expected at least ${optionIndex + 1} delivery options, found ${optionCount}.`
    )
  }

  const selectedOption = deliveryOptions.nth(optionIndex)
  const selectedLabel = await getDeliveryOptionLabel(page, optionIndex)

  await expect
    .poll(async () => {
      await selectedOption.focus()
      await selectedOption.press("Space")

      return String(await submitButton.isEnabled())
    }, { timeout: 20_000 })
    .toBe("true")

  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("payment")

  return selectedLabel
}

const rapidSwitchDeliveryOptionsAndContinue = async (
  page: Page,
  optionSequence: number[]
) => {
  const deliveryOptions = page.getByTestId("delivery-option-radio")
  const submitButton = page.getByTestId("submit-delivery-option-button")
  let lastSelectedLabel = ""

  await expect
    .poll(async () => deliveryOptions.count(), { timeout: 15_000 })
    .toBeGreaterThan(Math.max(...optionSequence))

  for (const optionIndex of optionSequence) {
    lastSelectedLabel = await getDeliveryOptionLabel(page, optionIndex)
    await deliveryOptions.nth(optionIndex).click()
  }

  await expect
    .poll(async () => submitButton.isEnabled(), { timeout: 20_000 })
    .toBe(true)

  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("payment")

  return lastSelectedLabel
}

const completeDeliveryStep = async (
  page: Page,
  countryCode: string,
  optionIndex = 0
) => {
  await page.goto(`/${countryCode}/checkout?step=delivery`, {
    waitUntil: "domcontentloaded",
  })

  return selectDeliveryOptionAndContinue(page, optionIndex)
}

const ensureManualPaymentSelected = async (page: Page) => {
  const manualPaymentCard = page.getByRole("radio", {
    name: new RegExp(MANUAL_PAYMENT_LABEL, "i"),
  })
  const submitPaymentButton = page.getByTestId("submit-payment-button")

  await expect(manualPaymentCard).toBeVisible()

  await expect
    .poll(async () => {
      await manualPaymentCard.click()

      return [
        await manualPaymentCard.getAttribute("aria-checked"),
        String(await submitPaymentButton.isEnabled()),
        (await submitPaymentButton.textContent())?.trim() ?? "",
      ].join("|")
    }, { timeout: 20_000 })
    .toBe("true|true|Continue to review")

  return { manualPaymentCard, submitPaymentButton }
}

const continueWithManualPayment = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}/checkout?step=payment`, {
    waitUntil: "domcontentloaded",
  })

  const { submitPaymentButton } = await ensureManualPaymentSelected(page)
  await submitPaymentButton.click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("review")

  await expect(page.getByTestId("review-payment-summary-strip")).toContainText(
    MANUAL_PAYMENT_LABEL
  )
}

const placeManualOrder = async (page: Page) => {
  const submitOrderButton = page.getByTestId("submit-order-button")
  const manualPaymentError = page.getByTestId("manual-payment-error-message")

  await expect(submitOrderButton).toBeEnabled()
  await submitOrderButton.click()

  await expect
    .poll(async () => {
      if ((await manualPaymentError.count()) > 0) {
        return `error:${(await manualPaymentError.first().textContent())?.trim() ?? "unknown"}`
      }

      return /\/order\/[^/]+\/confirmed$/.test(page.url())
        ? "confirmed"
        : "pending"
    }, { timeout: 60_000 })
    .toBe("confirmed")

  await expect(page.getByTestId("order-complete-container")).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByTestId("order-complete-container")).toContainText(
    "Thank you"
  )
}

const captureReviewTotals = async (page: Page) => {
  const shippingValue = Number(
    await page.getByTestId("cart-shipping").getAttribute("data-value")
  )
  const totalValue = Number(
    await page.getByTestId("cart-total").getAttribute("data-value")
  )

  return {
    shippingValue,
    totalValue,
  }
}

const editAddressFromReview = async (
  page: Page,
  countryCode: string,
  nextCity: string,
  nextAddressLine: string
) => {
  const reviewEditShortcuts = page.getByTestId("review-edit-shortcuts")

  await expect(reviewEditShortcuts).toBeVisible()
  await reviewEditShortcuts
    .getByRole("button", { name: "Edit address" })
    .click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("address")

  await fillAddressForm(page, countryCode, {
    addressLine: nextAddressLine,
    city: nextCity,
    province: nextCity,
  })
  await page.getByTestId("submit-address-button").click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("delivery")
}

const editDeliveryFromReview = async (page: Page, nextOptionIndex = 1) => {
  const reviewEditShortcuts = page.getByTestId("review-edit-shortcuts")

  await expect(reviewEditShortcuts).toBeVisible()
  await reviewEditShortcuts
    .getByRole("button", { name: "Edit delivery" })
    .click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("delivery")

  return selectDeliveryOptionAndContinue(page, nextOptionIndex)
}

const editPaymentFromReview = async (page: Page) => {
  const reviewEditShortcuts = page.getByTestId("review-edit-shortcuts")

  await expect(reviewEditShortcuts).toBeVisible()
  await reviewEditShortcuts
    .getByRole("button", { name: "Edit payment" })
    .click()

  await expect
    .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
    .toBe("payment")

  const manualPaymentCard = page.getByRole("radio", {
    name: new RegExp(MANUAL_PAYMENT_LABEL, "i"),
  })

  await expect(manualPaymentCard).toHaveAttribute("aria-checked", "true")
  await expect(page.getByTestId("submit-payment-button")).toBeEnabled()
}

test.describe("Checkout happy path", () => {
  test("places an order through the local manual payment flow", async ({ page }) => {
    test.setTimeout(240_000)

    const countryCode = DEFAULT_COUNTRY_CODE

    await addAnySellableProductToCart(page, countryCode)
    await completeAddressStep(page, countryCode)
    await completeDeliveryStep(page, countryCode)
    await continueWithManualPayment(page, countryCode)
    await placeManualOrder(page)
  })

  test("allows editing the address from review and still completing the order", async ({
    page,
  }) => {
    test.setTimeout(240_000)

    const countryCode = DEFAULT_COUNTRY_CODE
    const editedCity = "Tel Aviv"
    const editedAddressLine = "12 Edited Route"

    await addAnySellableProductToCart(page, countryCode)
    await completeAddressStep(page, countryCode)
    await completeDeliveryStep(page, countryCode)
    await continueWithManualPayment(page, countryCode)

    await editAddressFromReview(page, countryCode, editedCity, editedAddressLine)
    await completeDeliveryStep(page, countryCode)
    await continueWithManualPayment(page, countryCode)

    await expect(page.getByTestId("shipping-address-summary")).toContainText(
      editedAddressLine
    )
    await expect(page.getByTestId("shipping-address-summary")).toContainText(
      editedCity
    )

    await placeManualOrder(page)
  })

  test("allows editing payment from review and still completing the order", async ({
    page,
  }) => {
    test.setTimeout(240_000)

    const countryCode = DEFAULT_COUNTRY_CODE

    await addAnySellableProductToCart(page, countryCode)
    await completeAddressStep(page, countryCode)
    await completeDeliveryStep(page, countryCode)
    await continueWithManualPayment(page, countryCode)

    await editPaymentFromReview(page)

    await page.getByTestId("submit-payment-button").click()

    await expect
      .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
      .toBe("review")

    await expect(page.getByTestId("review-payment-summary-strip")).toContainText(
      MANUAL_PAYMENT_LABEL
    )

    await placeManualOrder(page)
  })

  test("allows editing the delivery method from review and still completing the order", async ({
    page,
  }) => {
    test.setTimeout(240_000)

    const countryCode = DEFAULT_COUNTRY_CODE
    const checkoutErrors = trackCheckoutErrors(page)

    await addAnySellableProductToCart(page, countryCode)
    await completeAddressStep(page, countryCode)
    const initialDeliveryLabel = await completeDeliveryStep(page, countryCode, 0)
    await continueWithManualPayment(page, countryCode)
    const initialReviewTotals = await captureReviewTotals(page)

    const updatedDeliveryLabel = await editDeliveryFromReview(page, 1)
    expect(updatedDeliveryLabel).not.toBe(initialDeliveryLabel)

    await continueWithManualPayment(page, countryCode)

    const updatedReviewTotals = await captureReviewTotals(page)
    expect(updatedReviewTotals.shippingValue).toBe(
      parseAmountFromLabel(updatedDeliveryLabel)
    )
    expect(updatedReviewTotals.shippingValue).not.toBe(
      initialReviewTotals.shippingValue
    )
    expect(updatedReviewTotals.totalValue).not.toBe(initialReviewTotals.totalValue)

    expect(checkoutErrors.consoleErrors).toEqual([])
    expect(checkoutErrors.pageErrors).toEqual([])
    expect(checkoutErrors.failedResponses).toEqual([])
  })

  test("keeps the final delivery selection consistent after rapid switching", async ({
    page,
  }) => {
    test.setTimeout(240_000)

    const countryCode = DEFAULT_COUNTRY_CODE
    const checkoutErrors = trackCheckoutErrors(page)

    await addAnySellableProductToCart(page, countryCode)
    await completeAddressStep(page, countryCode)
    const initialDeliveryLabel = await completeDeliveryStep(page, countryCode, 0)
    await continueWithManualPayment(page, countryCode)
    const initialReviewTotals = await captureReviewTotals(page)

    const reviewEditShortcuts = page.getByTestId("review-edit-shortcuts")
    await expect(reviewEditShortcuts).toBeVisible()
    await reviewEditShortcuts
      .getByRole("button", { name: "Edit delivery" })
      .click()

    await expect
      .poll(() => stepFromUrl(page.url()), { timeout: 15_000 })
      .toBe("delivery")

    const finalDeliveryLabel = await rapidSwitchDeliveryOptionsAndContinue(page, [
      0,
      1,
      0,
      1,
    ])

    expect(finalDeliveryLabel).not.toBe(initialDeliveryLabel)

    await continueWithManualPayment(page, countryCode)

    const updatedReviewTotals = await captureReviewTotals(page)
    expect(updatedReviewTotals.shippingValue).toBe(
      parseAmountFromLabel(finalDeliveryLabel)
    )
    expect(updatedReviewTotals.shippingValue).not.toBe(
      initialReviewTotals.shippingValue
    )
    expect(updatedReviewTotals.totalValue).not.toBe(initialReviewTotals.totalValue)

    expect(checkoutErrors.consoleErrors).toEqual([])
    expect(checkoutErrors.pageErrors).toEqual([])
    expect(checkoutErrors.failedResponses).toEqual([])
  })
})