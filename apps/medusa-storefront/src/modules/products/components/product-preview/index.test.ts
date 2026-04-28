import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const getLocaleMock = vi.fn(async () => "en")
const getProductPriceMock = vi.fn(() => ({ cheapestPrice: null }))

vi.mock("@lib/data/locale-actions", () => ({
  getLocale: () => getLocaleMock(),
}))

vi.mock("@lib/util/get-product-price", () => ({
  getProductPrice: (...args: unknown[]) => getProductPriceMock(...args),
}))

vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) =>
    React.createElement("a", { href, ...props }, children),
}))

vi.mock("../thumbnail", () => ({
  default: () => React.createElement("div", { "data-testid": "thumbnail-mock" }),
}))

vi.mock("./wishlist-button", () => ({
  default: () => React.createElement("button", { "data-testid": "wishlist-button-mock" }),
}))

vi.mock("./price", () => ({
  default: () => React.createElement("span", { "data-testid": "preview-price-mock" }, "price"),
}))

import ProductPreview from "./index"

const buildProduct = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "prod_test",
    title: "Test product",
    handle: "test-product",
    metadata: null,
    thumbnail: null,
    images: [],
    variants: [
      {
        id: "variant_1",
        manage_inventory: true,
        allow_backorder: false,
        inventory_quantity: 7,
      },
    ],
    ...overrides,
  }) as any

const region = { id: "reg_test" } as any

describe("ProductPreview stock badge", () => {
  it("renders available-on-request badge when fallback stock mode is no_stock", async () => {
    const element = await ProductPreview({
      product: buildProduct(),
      region,
      defaultStockMode: "no_stock",
    })

    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-testid="product-preview-stock-status"')
    expect(html).toContain('data-stock-mode="no_stock"')
    expect(html).toContain('data-stock-state="available_on_request"')
    expect(html).toContain("Available on request")
  })

  it("renders hidden-count in-stock badge when fallback stock mode is track_hidden", async () => {
    const element = await ProductPreview({
      product: buildProduct(),
      region,
      defaultStockMode: "track_hidden",
    })

    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-testid="product-preview-stock-status"')
    expect(html).toContain('data-stock-mode="track_hidden"')
    expect(html).toContain('data-stock-state="in_stock"')
    expect(html).toContain(">In stock<")
    expect(html).not.toContain("7 in stock")
  })

  it("omits stock badge when listing payload does not include inventory quantities", async () => {
    const element = await ProductPreview({
      product: buildProduct({
        variants: [
          {
            id: "variant_1",
            manage_inventory: true,
            allow_backorder: false,
          },
        ],
      }),
      region,
      defaultStockMode: "track_visible",
    })

    const html = renderToStaticMarkup(element)

    expect(html).not.toContain('data-testid="product-preview-stock-status"')
    expect(html).not.toContain("In stock")
    expect(html).not.toContain("Out of stock")
  })
})
