import { expect, test, type Locator, type Page } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"
const DEFAULT_FIRST_NAME = "PayPal"
const DEFAULT_LAST_NAME = "Tester"
const DEFAULT_ADDRESS_LINE = "9 Sandbox Street"
const DEFAULT_POSTAL_CODE = "61000"
const DEFAULT_CITY = "Haifa"
const DEFAULT_PHONE = "+972501234567"
const DEFAULT_EMAIL = "checkout-paypal-path@example.com"
const PAYPAL_SANDBOX_BUYER_EMAIL = process.env.PAYPAL_SANDBOX_BUYER_EMAIL
const PAYPAL_SANDBOX_BUYER_PASSWORD = process.env.PAYPAL_SANDBOX_BUYER_PASSWORD

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

const getPayPalButtonRoot = (page: Page) => page.getByTestId("submit-order-button")

const clickFirstVisible = async (locators: Locator[]) => {
  for (const locator of locators) {
    if ((await locator.count()) === 0) {
      continue
    }

    const candidate = locator.first()

    if (!(await candidate.isVisible())) {
      continue
    }

    await candidate.click()
    return true
  }

  return false
}

const clickPayPalCandidateAndWaitForPopup = async (
  page: Page,
  locator: Locator
) => {
  if ((await locator.count()) === 0) {
    return null
  }

  const candidate = locator.first()

  if (!(await candidate.isVisible())) {
    return null
  }

  await candidate.scrollIntoViewIfNeeded()

  try {
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 7_500 }),
      candidate.click({ force: true }),
    ])

    return popup
  } catch {
    return null
  }
}

const openPayPalPopup = async (page: Page) => {
  const payPalButtonRoot = getPayPalButtonRoot(page)
  await payPalButtonRoot.scrollIntoViewIfNeeded()
  await expect(payPalButtonRoot.locator("iframe").first()).toBeVisible({
    timeout: 30_000,
  })

  const payPalFrame = payPalButtonRoot.frameLocator("iframe").first()

  for (const candidate of [
    payPalFrame.locator("a").first(),
    payPalFrame.getByRole("link", { name: /paypal/i }),
    payPalFrame.locator("button").first(),
    payPalFrame.getByRole("button", { name: /paypal/i }),
    payPalFrame.locator('[data-funding-source="paypal"]'),
    payPalFrame.locator(".paypal-button"),
  ]) {
    const popup = await clickPayPalCandidateAndWaitForPopup(page, candidate)

    if (!popup) {
      continue
    }

    await popup.waitForLoadState("domcontentloaded")
    await popup.waitForURL(/paypal\.com/, { timeout: 30_000 })

    return popup
  }

    throw new Error("Unable to find a clickable PayPal button inside the SDK iframe.")
}

const switchPayPalPopupToEnglish = async (popup: Page) => {
  const englishLink = popup.locator('a[href*="langTgl=en"], a[href*="locale.x=en_US"]').first()

  if ((await englishLink.count()) === 0 || !(await englishLink.isVisible())) {
    return
  }

  await englishLink.click()
  await popup.waitForLoadState("domcontentloaded")
}

const isVisible = async (locator: Locator, timeout = 5_000) => {
  try {
    await locator.waitFor({ state: "visible", timeout })
    return true
  } catch {
    return false
  }
}

const ensurePayPalPasswordStage = async (popup: Page, email: string) => {
  const passwordInput = popup.locator('input[name="login_password"]')

  if (await isVisible(passwordInput)) {
    return passwordInput
  }

  const logInButton = popup.getByRole("button", { name: /log in/i })

  if (await isVisible(logInButton)) {
    await logInButton.click()
    await popup.waitForLoadState("domcontentloaded")
  }

  if (await isVisible(passwordInput)) {
    return passwordInput
  }

  const emailInput = popup.locator('input[name="login_email"]')

  if (await isVisible(emailInput)) {
    await emailInput.fill(email)

    const nextButton = popup.locator("button#btnNext")

    if (await isVisible(nextButton, 2_000)) {
      await nextButton.click()
      await popup.waitForLoadState("domcontentloaded")
    }
  }

  await expect(passwordInput).toBeVisible({ timeout: 30_000 })

  return passwordInput
}

const loginToPayPalSandbox = async (
  popup: Page,
  email: string,
  password: string
) => {
  await switchPayPalPopupToEnglish(popup)

  const emailInput = popup.locator('input[name="login_email"]')
  await expect(emailInput).toBeVisible({ timeout: 30_000 })
  await emailInput.fill(email)
  await popup.locator("button#btnNext").click()

  const passwordInput = await ensurePayPalPasswordStage(popup, email)
  await passwordInput.fill(password)
  await popup.locator("button#btnLogin").click()
  await popup.waitForLoadState("domcontentloaded")
}

const approvePayPalSandboxCheckout = async (popup: Page) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (popup.isClosed()) {
      return
    }

    await popup.waitForLoadState("domcontentloaded")

    const didAdvance = await clickFirstVisible([
      popup.locator("button#payment-submit-btn"),
      popup.locator('button[name="confirmButtonTop"]'),
      popup.locator('button[name="continue"]'),
      popup.getByRole("button", {
        name: /pay now|complete purchase|agree and continue|agree & continue|continue|pay/i,
      }),
      popup.getByRole("link", {
        name: /pay now|complete purchase|agree and continue|agree & continue|continue|pay/i,
      }),
    ])

    if (!didAdvance) {
      return
    }
  }
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

  test("completes sandbox approval and lands on the confirmed order page", async ({
    page,
  }) => {
    test.setTimeout(300_000)

    test.skip(
      !PAYPAL_SANDBOX_BUYER_EMAIL || !PAYPAL_SANDBOX_BUYER_PASSWORD,
      "Set PAYPAL_SANDBOX_BUYER_EMAIL and PAYPAL_SANDBOX_BUYER_PASSWORD to run the full PayPal sandbox approval flow."
    )

    const countryCode = DEFAULT_COUNTRY_CODE

    await addAnySellableProductToCart(page, countryCode)
    await completeAddressStep(page, countryCode)
    await completeDeliveryStep(page, countryCode)
    await continueWithPayPal(page, countryCode)

    await expect(page.getByTestId("review-payment-summary-strip")).toContainText(
      "PayPal"
    )

    const popup = await openPayPalPopup(page)
    await loginToPayPalSandbox(
      popup,
      PAYPAL_SANDBOX_BUYER_EMAIL!,
      PAYPAL_SANDBOX_BUYER_PASSWORD!
    )
    await approvePayPalSandboxCheckout(popup)

    await expect
      .poll(() => /\/order\/[^/]+\/confirmed$/.test(page.url()), {
        timeout: 120_000,
      })
      .toBe(true)

    await expect(page.getByTestId("order-complete-container")).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByTestId("order-complete-container")).toContainText(
      "Thank you"
    )
  })
})