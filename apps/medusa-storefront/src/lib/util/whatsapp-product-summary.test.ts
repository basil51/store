import { describe, expect, it } from "vitest"

import {
  buildLocalizedWhatsAppCartLine,
  buildLocalizedWhatsAppProductLine,
  buildLocalizedWhatsAppSelectionDetailsText,
  buildLocalizedWhatsAppSelectionRows,
} from "./whatsapp-product-summary"

const localizedProduct = {
  options: [
    {
      id: "opt_color",
      title: { en: "Color", ar: "اللون", he: "צבע" },
    },
    {
      id: "opt_storage",
      title: { en: "Storage", ar: "التخزين", he: "אחסון" },
    },
  ],
  metadata: {
    specifications: [
      {
        label: { en: "Shade", ar: "اللون المختار", he: "גוון" },
        option_id: "opt_color",
      },
      {
        label: { en: "Capacity", ar: "السعة", he: "קיבולת" },
        option: { en: "Storage", ar: "التخزين", he: "אחסון" },
      },
    ],
  },
} as const

const variantOptions = [
  { option_id: "opt_color", value: "Blue" },
  { option_id: "opt_storage", value: "256GB" },
] as const

describe("whatsapp-product-summary", () => {
  it("prefers localized linked specification labels over raw option titles", () => {
    expect(
      buildLocalizedWhatsAppSelectionRows({
        product: localizedProduct,
        variantOptions,
        locale: "ar",
      })
    ).toEqual([
      { label: "اللون المختار", value: "Blue" },
      { label: "السعة", value: "256GB" },
    ])
  })

  it("uses variant-title fallback only when no option rows are available", () => {
    expect(
      buildLocalizedWhatsAppSelectionDetailsText({
        locale: "en",
        variantTitle: "Matte Black",
        presetTitle: "Studio Pack",
        setupLabel: "Setup",
        includeVariantTitleFallback: true,
      })
    ).toBe("Matte Black, Setup: Studio Pack")

    expect(
      buildLocalizedWhatsAppSelectionDetailsText({
        locale: "en",
        variantTitle: "Default Variant",
        presetTitle: "Studio Pack",
        setupLabel: "Setup",
        includeVariantTitleFallback: true,
      })
    ).toBe("Setup: Studio Pack")
  })

  it("builds the PDP WhatsApp line from the shared detail formatter", () => {
    expect(
      buildLocalizedWhatsAppProductLine({
        title: "Dell Latitude 3420",
        product: localizedProduct,
        variantOptions,
        locale: "en",
        presetTitle: "Creator Pack",
        setupLabel: "Setup",
        priceText: "$1,299.00",
      })
    ).toBe(
      "Dell Latitude 3420 (Shade: Blue, Capacity: 256GB, Setup: Creator Pack) - $1,299.00"
    )
  })

  it("builds the cart WhatsApp line from the same shared detail formatter", () => {
    expect(
      buildLocalizedWhatsAppCartLine({
        quantity: 2,
        title: "Dell Latitude 3420",
        product: localizedProduct,
        variantOptions,
        locale: "he",
        presetTitle: "ערכת יוצר",
        setupLabel: "הגדרה",
      })
    ).toBe("2x Dell Latitude 3420 (גוון: Blue, קיבולת: 256GB, הגדרה: ערכת יוצר)")
  })
})