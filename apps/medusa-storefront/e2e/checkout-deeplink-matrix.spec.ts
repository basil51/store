import { expect, test, type Page } from "@playwright/test"

type CheckoutStep = "address" | "delivery" | "payment" | "review"
type RequestedDeepLinkStep = "delivery" | "payment" | "review"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"
const DEFAULT_DEEP_LINK_ORDER: RequestedDeepLinkStep[] = [
  "delivery",
  "payment",
  "review",
]

const stepFromUrl = (url: string): CheckoutStep | null => {
  const step = new URL(url).searchParams.get("step")

  if (
    step === "address" ||
    step === "delivery" ||
    step === "payment" ||
    step === "review"
  ) {
    return step
  }

  return null
}

const checkoutPath = (
  countryCode: string,
  requestedStep: RequestedDeepLinkStep,
  probe: string
) =>
  `/${countryCode}/checkout?step=${requestedStep}&probe=${encodeURIComponent(probe)}`

const hasCartCookie = async (page: Page) => {
  const cookies = await page.context().cookies()
  return cookies.some((cookie) => cookie.name.startsWith("_medusa_cart_id"))
}

const selectFirstVariantOptions = async (page: Page) => {
  const optionGroups = page.getByTestId("product-options")
  const optionGroupCount = await optionGroups.count()

  for (let i = 0; i < optionGroupCount; i += 1) {
    const optionButtons = optionGroups.nth(i).getByTestId("option-button")
    const optionButtonCount = await optionButtons.count()

    if (optionButtonCount > 0) {
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
      // Continue trying other products if this one fails to create a cart.
    }
  }

  throw new Error("Could not add any discovered product to cart.")
}

const completeAddressStep = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}/checkout?step=address`, {
    waitUntil: "domcontentloaded",
  })

  await page.getByTestId("shipping-first-name-input").fill("Checkout")
  await page.getByTestId("shipping-last-name-input").fill("Matrix")
  await page.getByTestId("shipping-address-input").fill("1 Matrix Way")
  await page.getByTestId("shipping-postal-code-input").fill("61000")
  await page.getByTestId("shipping-city-input").fill("Haifa")
  await page.getByTestId("shipping-province-input").fill("Haifa")
  await page.getByTestId("shipping-country-select").selectOption(countryCode)
  await page
    .getByTestId("shipping-email-input")
    .fill("checkout-matrix@example.com")
  await page.getByTestId("shipping-phone-input").fill("+972501234567")

  const submitAddressButton = page.getByTestId("submit-address-button")
  await expect(submitAddressButton).toBeEnabled()
  await submitAddressButton.click()

  await expect
    .poll(() => stepFromUrl(page.url()), {
      message: "Address submit should advance checkout to delivery.",
    })
    .toBe("delivery")
}

const selectDeliveryMethod = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}/checkout?step=delivery`, {
    waitUntil: "domcontentloaded",
  })

  const deliveryOptionRadios = page.getByTestId("delivery-option-radio")
  const submitDeliveryButton = page.getByTestId("submit-delivery-option-button")
  const optionCount = await deliveryOptionRadios.count()

  if (optionCount === 0) {
    throw new Error("No delivery options were rendered for checkout.")
  }

  for (let i = 0; i < optionCount; i += 1) {
    await deliveryOptionRadios.nth(i).click()

    try {
      await expect
        .poll(async () => submitDeliveryButton.isEnabled(), { timeout: 4_000 })
        .toBe(true)
      break
    } catch {
      // Try the next option if this click did not select a shippable method.
    }
  }

  await expect(submitDeliveryButton).toBeEnabled()
}

const completeDeliveryStep = async (page: Page, countryCode: string) => {
  await selectDeliveryMethod(page, countryCode)

  const submitDeliveryButton = page.getByTestId("submit-delivery-option-button")
  await submitDeliveryButton.click()

  await expect
    .poll(() => stepFromUrl(page.url()), {
      message: "Delivery submit should advance checkout to payment.",
    })
    .toBe("payment")
}

const ensurePendingPaymentSession = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}/checkout?step=payment`, {
    waitUntil: "domcontentloaded",
  })

  const submitPaymentButton = page.getByTestId("submit-payment-button")
  await expect(submitPaymentButton).toBeVisible()

  if (await submitPaymentButton.isEnabled()) {
    await submitPaymentButton.click()

    if (stepFromUrl(page.url()) === "review") {
      return
    }
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.goto(
      `/${countryCode}/checkout?step=review&prime=review-${attempt}`,
      {
        waitUntil: "domcontentloaded",
      }
    )

    if (stepFromUrl(page.url()) === "review") {
      return
    }

    await page.goto(
      `/${countryCode}/checkout?step=payment&prime=payment-${attempt}`,
      {
        waitUntil: "domcontentloaded",
      }
    )

    await expect(submitPaymentButton).toBeVisible()
  }

  throw new Error(
    "Payment session did not become pending; review step remained guarded."
  )
}

const expectDeepLinkResolution = async (
  page: Page,
  countryCode: string,
  stateLabel: string,
  requestedStep: RequestedDeepLinkStep,
  expectedStep: CheckoutStep
) => {
  const probe = `${stateLabel}-${requestedStep}`

  await page.goto(checkoutPath(countryCode, requestedStep, probe), {
    waitUntil: "domcontentloaded",
  })

  await expect
    .poll(() => stepFromUrl(page.url()), {
      message: `${stateLabel}: step=${requestedStep} should resolve to ${expectedStep}.`,
    })
    .toBe(expectedStep)

  const resolvedUrl = new URL(page.url())
  expect(resolvedUrl.searchParams.get("probe")).toBe(probe)
}

const runMatrixForState = async (
  page: Page,
  countryCode: string,
  stateLabel: string,
  expectedByRequestedStep: Record<RequestedDeepLinkStep, CheckoutStep>,
  requestedOrder: RequestedDeepLinkStep[] = DEFAULT_DEEP_LINK_ORDER
) => {
  for (const requestedStep of requestedOrder) {
    await expectDeepLinkResolution(
      page,
      countryCode,
      stateLabel,
      requestedStep,
      expectedByRequestedStep[requestedStep]
    )
  }
}

test.describe("Checkout deep-link matrix", () => {
  test("routes to the first required step across prerequisite states", async ({
    page,
  }) => {
    test.setTimeout(240_000)

    const countryCode = DEFAULT_COUNTRY_CODE

    await addAnySellableProductToCart(page, countryCode)

    await runMatrixForState(page, countryCode, "state-a", {
      delivery: "address",
      payment: "address",
      review: "address",
    })

    await completeAddressStep(page, countryCode)

    await runMatrixForState(page, countryCode, "state-b", {
      delivery: "delivery",
      payment: "delivery",
      review: "delivery",
    })

    await selectDeliveryMethod(page, countryCode)

    await runMatrixForState(
      page,
      countryCode,
      "state-c",
      {
        delivery: "delivery",
        payment: "payment",
        review: "payment",
      },
      ["delivery", "review", "payment"]
    )

    await ensurePendingPaymentSession(page, countryCode)

    await runMatrixForState(page, countryCode, "state-d", {
      delivery: "delivery",
      payment: "payment",
      review: "review",
    })
  })
})
