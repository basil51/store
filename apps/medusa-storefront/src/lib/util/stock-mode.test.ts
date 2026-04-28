import { describe, expect, it } from "vitest"

import {
  getProductStockSummary,
  getVariantMaxOrderQuantity,
  isVariantPurchasable,
  parseProductStockMode,
  type ProductStockMode,
} from "./stock-mode"

const buildVariant = (overrides: Record<string, unknown> = {}) =>
  ({
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 4,
    ...overrides,
  }) as any

const buildProduct = (overrides: Record<string, unknown> = {}) =>
  ({
    metadata: {},
    variants: [buildVariant()],
    ...overrides,
  }) as any

describe("stock-mode", () => {
  it("uses the store default stock mode when product metadata omits one", () => {
    expect(parseProductStockMode({}, "no_stock")).toBe("no_stock")
  })

  it("keeps product stock mode above the store default", () => {
    expect(
      parseProductStockMode({ stock_mode: "track_hidden" }, "no_stock")
    ).toBe("track_hidden")
  })

  it("treats no_stock variants as purchasable regardless of inventory", () => {
    expect(
      isVariantPurchasable(buildVariant({ inventory_quantity: 0 }), "no_stock")
    ).toBe(true)
  })

  it("caps tracked inventory quantity by the variant inventory count", () => {
    expect(
      getVariantMaxOrderQuantity(
        buildVariant({ inventory_quantity: 3 }),
        "track_visible"
      )
    ).toBe(3)
  })

  it("keeps the fallback max quantity for backorder and no_stock flows", () => {
    const scenarios: Array<{
      variant: any
      mode: ProductStockMode
    }> = [
      {
        variant: buildVariant({ inventory_quantity: 0, allow_backorder: true }),
        mode: "track_hidden",
      },
      {
        variant: buildVariant({ inventory_quantity: 0 }),
        mode: "no_stock",
      },
    ]

    for (const scenario of scenarios) {
      expect(getVariantMaxOrderQuantity(scenario.variant, scenario.mode)).toBe(10)
    }
  })

  it("never returns less than one for tracked inventory variants", () => {
    expect(
      getVariantMaxOrderQuantity(
        buildVariant({ inventory_quantity: 0 }),
        "track_visible"
      )
    ).toBe(1)
  })

  it("returns an available-on-request summary for no_stock products", () => {
    expect(getProductStockSummary(buildProduct(), "no_stock")).toEqual({
      label: "Available on request",
      state: "available_on_request",
    })
  })

  it("summarizes tracked inventory counts for browse cards", () => {
    expect(
      getProductStockSummary(
        buildProduct({
          variants: [
            buildVariant({ inventory_quantity: 3 }),
            buildVariant({ inventory_quantity: 2 }),
          ],
        }),
        "track_visible"
      )
    ).toEqual({
      label: "5 in stock",
      state: "in_stock",
    })
  })

  it("uses caller-provided stock copy for localized browse labels", () => {
    expect(
      getProductStockSummary(buildProduct(), "track_visible", {
        countInStock: (quantity) => `${quantity} available locally`,
      })
    ).toEqual({
      label: "4 available locally",
      state: "in_stock",
    })
  })

  it("uses fallback no_stock mode to render on-demand summary when metadata is missing", () => {
    const stockMode = parseProductStockMode(undefined, "no_stock")

    expect(getProductStockSummary(buildProduct(), stockMode)).toEqual({
      label: "Available on request",
      state: "available_on_request",
    })
  })

  it("uses fallback track_hidden mode to hide numeric stock counts", () => {
    const stockMode = parseProductStockMode(undefined, "track_hidden")

    expect(
      getProductStockSummary(
        buildProduct({
          metadata: null,
          variants: [buildVariant({ inventory_quantity: 7 })],
        }),
        stockMode
      )
    ).toEqual({
      label: "In stock",
      state: "in_stock",
    })
  })

  it("uses hidden-count messaging when the product stock mode hides quantities", () => {
    expect(
      getProductStockSummary(
        buildProduct({ variants: [buildVariant({ inventory_quantity: 2 })] }),
        "track_hidden"
      )
    ).toEqual({
      label: "In stock",
      state: "in_stock",
    })
  })

  it("surfaces backorder availability when tracked variants have no stock", () => {
    expect(
      getProductStockSummary(
        buildProduct({
          variants: [buildVariant({ inventory_quantity: 0, allow_backorder: true })],
        }),
        "track_visible"
      )
    ).toEqual({
      label: "Backorder available",
      state: "backorder_available",
    })
  })

  it("returns null when browse payloads do not carry tracked inventory data", () => {
    expect(
      getProductStockSummary(
        buildProduct({
          variants: [
            {
              manage_inventory: true,
              allow_backorder: false,
            },
          ],
        }),
        "track_visible"
      )
    ).toBeNull()
  })
})