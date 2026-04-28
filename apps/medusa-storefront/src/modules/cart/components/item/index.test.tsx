import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/cart", () => ({
  updateLineItem: vi.fn(),
}))

vi.mock("@medusajs/ui", () => ({
  Table: {
    Row: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement("tr", props, children),
    Cell: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement("td", props, children),
  },
  Text: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement("span", props, children),
  clx: (...parts: unknown[]) => parts.filter(Boolean).join(" "),
}))

vi.mock("@modules/cart/components/cart-item-select", () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement("select", props, children),
}))

vi.mock("@modules/checkout/components/error-message", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/delete-button", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/line-item-options", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/line-item-price", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/line-item-setup", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/line-item-unit-price", () => ({
  default: () => null,
}))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) =>
    React.createElement("a", { href, ...props }, children),
}))
vi.mock("@modules/common/icons/spinner", () => ({
  default: () => null,
}))
vi.mock("@modules/products/components/thumbnail", () => ({
  default: () => null,
}))

import Item from "./index"

const buildItem = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "item_1",
    product_handle: "test-product",
    thumbnail: null,
    product_title: "Test product",
    quantity: 1,
    variant: {
      id: "variant_1",
      title: "Default",
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 3,
      product: {
        metadata: null,
        images: [],
      },
    },
    ...overrides,
  }) as any

describe("Cart Item quantity fallback behavior", () => {
  it("caps options by inventory for fallback track_visible", () => {
    const html = renderToStaticMarkup(
      <Item
        item={buildItem()}
        currencyCode="usd"
        defaultStockMode="track_visible"
      />
    )

    expect((html.match(/<option/g) ?? []).length).toBe(3)
    expect(html).toContain(">3<")
    expect(html).not.toContain(">4<")
  })

  it("uses default max quantity for fallback no_stock", () => {
    const html = renderToStaticMarkup(
      <Item
        item={buildItem({
          variant: {
            id: "variant_1",
            title: "Default",
            manage_inventory: true,
            allow_backorder: false,
            inventory_quantity: 0,
            product: {
              metadata: null,
              images: [],
            },
          },
        })}
        currencyCode="usd"
        defaultStockMode="no_stock"
      />
    )

    expect((html.match(/<option/g) ?? []).length).toBe(10)
    expect(html).toContain(">10<")
  })

  it("uses default max quantity for fallback track_hidden when backorder is allowed", () => {
    const html = renderToStaticMarkup(
      <Item
        item={buildItem({
          variant: {
            id: "variant_1",
            title: "Default",
            manage_inventory: true,
            allow_backorder: true,
            inventory_quantity: 0,
            product: {
              metadata: null,
              images: [],
            },
          },
        })}
        currencyCode="usd"
        defaultStockMode="track_hidden"
      />
    )

    expect((html.match(/<option/g) ?? []).length).toBe(10)
    expect(html).toContain(">10<")
  })

  it("keeps current quantity selectable when it is above computed max", () => {
    const html = renderToStaticMarkup(
      <Item
        item={buildItem({
          quantity: 12,
          variant: {
            id: "variant_1",
            title: "Default",
            manage_inventory: true,
            allow_backorder: false,
            inventory_quantity: 3,
            product: {
              metadata: null,
              images: [],
            },
          },
        })}
        currencyCode="usd"
        defaultStockMode="track_visible"
      />
    )

    expect((html.match(/<option/g) ?? []).length).toBe(12)
    expect(html).toContain(">12<")
    expect(html).not.toContain(">13<")
  })
})
