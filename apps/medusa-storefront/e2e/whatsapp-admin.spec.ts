import { expect, test, type APIRequestContext, type Page } from "@playwright/test"

const STOREFRONT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8000"
const ADMIN_BASE_URL =
  process.env.MEDUSA_ADMIN_BASE_URL ?? "http://127.0.0.1:9244/app"
const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ?? new URL(ADMIN_BASE_URL).origin
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL ?? "admin@store.local"
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD ?? "Admin123!"
const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"
const PUBLISHABLE_KEY_COOKIE = "_medusa_publishable_key"

const ADMIN_CART_SETTINGS_LOCALES = [
  {
    locale: "ar",
    mode: "pdp",
    note: "ملاحظة اختبار عربية",
    noteLabel: "ملاحظة",
  },
  {
    locale: "he",
    mode: "cart",
    note: "הערת בדיקה בעברית",
    noteLabel: "הערה",
  },
] as const

const buildSeedDate = () => {
  const runId = Date.now()
  const month = String((runId % 12) + 1).padStart(2, "0")
  const day = String((Math.floor(runId / 1000) % 28) + 1).padStart(2, "0")

  return `2099-${month}-${day}`
}

const getAdminAppBaseUrl = () => ADMIN_BASE_URL.replace(/\/$/, "")

const fillAndAssertValue = async (locator: ReturnType<Page["getByRole"]> | ReturnType<Page["getByPlaceholder"]>, value: string) => {
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

const loginToAdmin = async (page: Page) => {
  const adminAppBaseUrl = getAdminAppBaseUrl()
  const adminHomeUrlPattern = /\/app(?:\/orders)?$/

  await page.goto(`${adminAppBaseUrl}/login`, { waitUntil: "domcontentloaded" })

  const emailInput = page.locator('input[name="email"]')

  await Promise.race([
    emailInput.waitFor({ state: "visible", timeout: 15_000 }),
    page.waitForURL(adminHomeUrlPattern, { timeout: 15_000 }),
  ]).catch(() => undefined)

  if (adminHomeUrlPattern.test(page.url())) {
    return
  }

  if (await emailInput.isVisible().catch(() => false)) {
    const passwordInput = page.locator('input[name="password"]')

    await fillAndAssertValue(emailInput, ADMIN_EMAIL)
    await fillAndAssertValue(passwordInput, ADMIN_PASSWORD)

    await Promise.all([
      page.waitForURL(adminHomeUrlPattern, { timeout: 15_000 }),
      page.getByRole("button", { name: "Continue with Email" }).click(),
    ])

    return
  }

  await expect(page).toHaveURL(adminHomeUrlPattern)
}

const resolvePublishableKey = async (page: Page) => {
  await page.goto(`${STOREFRONT_BASE_URL.replace(/\/$/, "")}/${DEFAULT_COUNTRY_CODE}`, {
    waitUntil: "domcontentloaded",
  })

  const publishableKey = (await page.context().cookies()).find(
    (cookie) => cookie.name === PUBLISHABLE_KEY_COOKIE
  )?.value

  if (!publishableKey) {
    throw new Error("Could not resolve the storefront publishable API key cookie.")
  }

  return publishableKey
}

const postWhatsAppAnalyticsEvent = async (
  request: APIRequestContext,
  publishableKey: string,
  eventName:
    | "whatsapp_preview_opened"
    | "whatsapp_message_copied"
    | "whatsapp_continue_clicked",
  payload: Record<string, string | number>
) => {
  const response = await request.post(`${MEDUSA_BACKEND_URL}/store/analytics/whatsapp`, {
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": publishableKey,
    },
    data: {
      event_name: eventName,
      payload,
    },
  })

  expect(response.status()).toBe(202)
}

const seedAnalyticsProbeData = async (
  request: APIRequestContext,
  publishableKey: string,
  seedDate: string
) => {
  const probePrefix = `phase6-admin-probe-${seedDate}`

  await postWhatsAppAnalyticsEvent(request, publishableKey, "whatsapp_preview_opened", {
    source: "product_page",
    locale: "ar",
    quantity: 1,
    item_count: 1,
    total: 1200,
    message_length: 120,
    product_title: `${probePrefix}-preview`,
    occurred_at: `${seedDate}T09:00:00.000Z`,
  })

  await postWhatsAppAnalyticsEvent(request, publishableKey, "whatsapp_message_copied", {
    source: "product_page",
    locale: "he",
    quantity: 1,
    item_count: 1,
    total: 1300,
    message_length: 132,
    product_title: `${probePrefix}-copy`,
    occurred_at: `${seedDate}T10:00:00.000Z`,
  })

  await postWhatsAppAnalyticsEvent(request, publishableKey, "whatsapp_continue_clicked", {
    source: "cart_summary",
    locale: "he",
    quantity: 2,
    item_count: 2,
    total: 2400,
    message_length: 148,
    product_title: `${probePrefix}-continue`,
    occurred_at: `${seedDate}T11:00:00.000Z`,
  })
}

test.describe("WhatsApp admin regression", () => {
  test("keeps Cart Settings locale preview aligned with shopper note output", async ({
    page,
  }) => {
    await loginToAdmin(page)
    await page.goto(`${getAdminAppBaseUrl()}/cart-settings`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByRole("heading", { name: "Cart Settings" })).toBeVisible()

    for (const localeCase of ADMIN_CART_SETTINGS_LOCALES) {
      await page.getByTestId(`whatsapp-template-locale-${localeCase.locale}`).click()
      await page.getByTestId(`cart-settings-preview-mode-${localeCase.mode}`).click()
      await page
        .getByTestId("cart-settings-preview-customer-note")
        .fill(localeCase.note)

      await expect(page.getByTestId("cart-settings-preview-message")).toContainText(
        `${localeCase.noteLabel}: ${localeCase.note}`
      )

      const previewLinkText =
        (await page.getByTestId("cart-settings-preview-link").textContent()) ?? ""

      expect(decodeURIComponent(previewLinkText)).toContain(
        `${localeCase.noteLabel}: ${localeCase.note}`
      )
    }
  })

  test("filters WhatsApp analytics with seeded locale and event data", async ({
    page,
    request,
  }) => {
    const seedDate = buildSeedDate()
    const publishableKey = await resolvePublishableKey(page)

    await seedAnalyticsProbeData(request, publishableKey, seedDate)
    await loginToAdmin(page)
    await page.goto(`${getAdminAppBaseUrl()}/whatsapp-analytics`, {
      waitUntil: "domcontentloaded",
    })

    await expect(
      page.getByRole("heading", { name: "WhatsApp Analytics" })
    ).toBeVisible()

    await page.getByTestId("whatsapp-analytics-from-input").fill(seedDate)
    await page.getByTestId("whatsapp-analytics-to-input").fill(seedDate)
    await page
      .getByTestId("whatsapp-analytics-source-select")
      .selectOption("cart_summary")
    await page
      .getByTestId("whatsapp-analytics-locale-select")
      .selectOption("he")
    await page
      .getByTestId("whatsapp-analytics-event-select")
      .selectOption("whatsapp_continue_clicked")
    await page.getByTestId("whatsapp-analytics-refresh").click()

    await expect(page.getByTestId("whatsapp-analytics-total-events")).toHaveText("1")
    await expect(page.getByTestId("whatsapp-analytics-chip-source")).toContainText(
      "Cart Summary"
    )
    await expect(page.getByTestId("whatsapp-analytics-chip-locale")).toContainText(
      "HE"
    )
    await expect(page.getByTestId("whatsapp-analytics-chip-event")).toContainText(
      "Continue clicked"
    )

    await page.getByTestId("whatsapp-analytics-reset").click()

    await expect(page.getByTestId("whatsapp-analytics-days-input")).toHaveValue("30")
    await expect(page.getByTestId("whatsapp-analytics-from-input")).toHaveValue("")
    await expect(page.getByTestId("whatsapp-analytics-to-input")).toHaveValue("")
    await expect(page.getByTestId("whatsapp-analytics-source-select")).toHaveValue("")
    await expect(page.getByTestId("whatsapp-analytics-locale-select")).toHaveValue("")
    await expect(page.getByTestId("whatsapp-analytics-event-select")).toHaveValue("")
  })
})