import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@lib/context/ui-locale-context", () => ({
  useUiLocale: () => "en",
}))

import VariantStockStatus from "./index"

const buildProduct = (metadata: Record<string, unknown> | null = null) =>
  ({
    metadata,
  }) as any

const buildVariant = (overrides: Record<string, unknown> = {}) =>
  ({
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 7,
    ...overrides,
  }) as any

describe("VariantStockStatus", () => {
  it("renders available-on-request status when fallback mode is no_stock", () => {
    const html = renderToStaticMarkup(
      <VariantStockStatus
        product={buildProduct(null)}
        variant={buildVariant({ inventory_quantity: 0 })}
        defaultStockMode="no_stock"
      />
    )

    expect(html).toContain('data-testid="variant-stock-status"')
    expect(html).toContain('data-stock-mode="no_stock"')
    expect(html).toContain("Available on request")
  })

  it("renders hidden-count status when fallback mode is track_hidden", () => {
    const html = renderToStaticMarkup(
      <VariantStockStatus
        product={buildProduct(undefined as unknown as null)}
        variant={buildVariant({ inventory_quantity: 7 })}
        defaultStockMode="track_hidden"
      />
    )

    expect(html).toContain('data-testid="variant-stock-status"')
    expect(html).toContain('data-stock-mode="track_hidden"')
    expect(html).toContain(">In stock<")
    expect(html).not.toContain("7 in stock")
  })
})
