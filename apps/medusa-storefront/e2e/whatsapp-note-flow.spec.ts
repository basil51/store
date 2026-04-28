import { expect, test, type Locator, type Page } from "@playwright/test"

const DEFAULT_COUNTRY_CODE = process.env.CHECKOUT_COUNTRY_CODE ?? "il"
const PDP_NOTE = "Please call before delivery."
const CART_NOTE = "Please use the side entrance."

const LOCALE_CASES = [
  {
    locale: "en",
    notePlaceholder:
      "Add a short request, question, or preferred contact detail",
    noteLabel: "Note",
    continueLabel: "Continue in WhatsApp",
  },
  {
    locale: "ar",
    notePlaceholder: "أضف طلباً قصيراً أو سؤالاً أو وسيلة تواصل مفضلة",
    noteLabel: "ملاحظة",
    continueLabel: "المتابعة إلى واتساب",
  },
  {
    locale: "he",
    notePlaceholder: "הוסיפו בקשה קצרה, שאלה או פרטי קשר מועדפים",
    noteLabel: "הערה",
    continueLabel: "המשך בוואטסאפ",
  },
] as const

const collectProductPaths = async (page: Page, countryCode: string) => {
  return page
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
}

const selectFirstVariantOptions = async (page: Page) => {
  const optionGroups = page.getByTestId("product-options")
  const optionGroupCount = await optionGroups.count()
  const selectedValues: string[] = []

  for (let i = 0; i < optionGroupCount; i += 1) {
    const optionButtons = optionGroups.nth(i).getByTestId("option-button")

    if ((await optionButtons.count()) > 0) {
      const buttonLabel = ((await optionButtons.first().textContent()) ?? "").trim()

      if (buttonLabel) {
        selectedValues.push(buttonLabel)
      }

      await optionButtons.first().click()
    }
  }

  return selectedValues
}

const getFirstVisibleEnabled = async (locator: Locator) => {
  const count = await locator.count()

  for (let i = 0; i < count; i += 1) {
    const candidate = locator.nth(i)

    if (!(await candidate.isVisible().catch(() => false))) {
      continue
    }

    if (!(await candidate.isEnabled().catch(() => false))) {
      continue
    }

    return candidate
  }

  throw new Error("Could not find a visible enabled element for the requested locator.")
}

const switchLanguage = async (
  page: Page,
  locale: (typeof LOCALE_CASES)[number]["locale"]
) => {
  await page.getByTestId("language-qa-select").click()
  await expect(page.getByTestId("language-qa-menu")).toBeVisible()
  await page.getByTestId(`language-option-${locale}`).click()
  await expect(page.getByTestId("language-qa-select")).toContainText(
    locale.toUpperCase()
  )
}

const openFirstWhatsAppReadyProduct = async (page: Page, countryCode: string) => {
  await page.goto(`/${countryCode}`, { waitUntil: "domcontentloaded" })

  const productPaths = await collectProductPaths(page, countryCode)

  if (!productPaths.length) {
    throw new Error(`No product links found under /${countryCode}/products/.`)
  }

  for (const productPath of productPaths.slice(0, 12)) {
    await page.goto(productPath, { waitUntil: "domcontentloaded" })
    await selectFirstVariantOptions(page)

    const noteInput = page.getByTestId("product-whatsapp-note-input").first()

    if ((await noteInput.count()) === 0) {
      continue
    }

    if (!(await noteInput.isVisible().catch(() => false))) {
      continue
    }

    try {
      await getFirstVisibleEnabled(page.getByTestId("product-whatsapp-button"))
      return
    } catch {
      // Try the next product if this one is not currently purchasable with WhatsApp.
    }
  }

  throw new Error("Could not find a WhatsApp-enabled product page.")
}

test.describe("WhatsApp shopper note flow", () => {
  test("shows shopper notes in PDP and cart WhatsApp previews", async ({ page }) => {
    await openFirstWhatsAppReadyProduct(page, DEFAULT_COUNTRY_CODE)

    const previewModal = page.getByTestId("whatsapp-preview-modal")
    const previewMessage = page.getByTestId("whatsapp-preview-message")
    const selectedOptionValues = await selectFirstVariantOptions(page)
    const productTitle =
      ((await page.getByTestId("product-title").first().textContent()) ?? "").trim()

    await page.getByTestId("product-whatsapp-note-input").first().fill(PDP_NOTE)
    await (await getFirstVisibleEnabled(
      page.getByTestId("product-whatsapp-button")
    )).click()

    await expect(previewModal).toBeVisible()
    await expect(previewMessage).toContainText(PDP_NOTE)
    await expect(previewMessage).toContainText(productTitle)

    for (const selectedValue of selectedOptionValues) {
      await expect(previewMessage).toContainText(selectedValue)
    }

    await page.getByTestId("close-modal-button").click()
    await expect(previewModal).toBeHidden()

    await (await getFirstVisibleEnabled(page.getByTestId("add-product-button"))).click()

    await expect(page.getByTestId("nav-cart-link")).toContainText(/\([1-9]/)

    await page.goto(`/${DEFAULT_COUNTRY_CODE}/cart`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("cart-whatsapp-note-input")).toBeVisible()
    await page.getByTestId("cart-whatsapp-note-input").fill(CART_NOTE)

    await (await getFirstVisibleEnabled(page.getByTestId("cart-whatsapp-button"))).click()

    await expect(previewModal).toBeVisible()
    await expect(previewMessage).toContainText(CART_NOTE)
  })

  for (const localeCase of LOCALE_CASES) {
    test(`localizes WhatsApp preview affordances for ${localeCase.locale.toUpperCase()}`, async ({
      page,
    }) => {
      await openFirstWhatsAppReadyProduct(page, DEFAULT_COUNTRY_CODE)
      await switchLanguage(page, localeCase.locale)
      const selectedOptionValues = await selectFirstVariantOptions(page)

      const previewModal = page.getByTestId("whatsapp-preview-modal")
      const previewMessage = page.getByTestId("whatsapp-preview-message")
      const localeNote = `${PDP_NOTE} (${localeCase.locale.toUpperCase()})`
      const productTitle =
        ((await page.getByTestId("product-title").first().textContent()) ?? "").trim()

      await expect(page.getByTestId("product-whatsapp-note-input").first()).toHaveAttribute(
        "placeholder",
        localeCase.notePlaceholder
      )

      await page.getByTestId("product-whatsapp-note-input").first().fill(localeNote)
      await (await getFirstVisibleEnabled(
        page.getByTestId("product-whatsapp-button")
      )).click()

      await expect(previewModal).toBeVisible()
      await expect(page.getByTestId("whatsapp-preview-open-button")).toHaveText(
        localeCase.continueLabel
      )
      await expect(previewMessage).toContainText(productTitle)

      for (const selectedValue of selectedOptionValues) {
        await expect(previewMessage).toContainText(selectedValue)
      }

      await expect(previewMessage).toContainText(
        `${localeCase.noteLabel}: ${localeNote}`
      )
    })
  }
})