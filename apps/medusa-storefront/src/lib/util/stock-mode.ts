import type { HttpTypes } from "@medusajs/types"

/**
 * Matches `DB.md` / roadmap stock modes. Set on the product in Admin → Metadata → `stock_mode`.
 */
export type ProductStockMode =
  | "track_visible"
  | "track_hidden"
  | "no_stock"

const MODES: ProductStockMode[] = [
  "track_visible",
  "track_hidden",
  "no_stock",
]

export function parseProductStockMode(
  metadata?: Record<string, unknown> | null
): ProductStockMode {
  const raw = metadata?.stock_mode
  if (typeof raw === "string" && MODES.includes(raw as ProductStockMode)) {
    return raw as ProductStockMode
  }
  return "track_visible"
}

/**
 * Whether the customer can add this variant to the cart.
 * `no_stock` ignores numeric inventory (on-demand / made-to-order).
 */
export function isVariantPurchasable(
  variant: HttpTypes.StoreProductVariant | undefined,
  stockMode: ProductStockMode
): boolean {
  if (!variant) {
    return false
  }
  if (stockMode === "no_stock") {
    return true
  }
  if (!variant.manage_inventory) {
    return true
  }
  if (variant.allow_backorder) {
    return true
  }
  return (variant.inventory_quantity ?? 0) > 0
}

/**
 * Human-readable stock line for PDP. Returns `null` to hide the row entirely.
 */
export function getVariantStockLabel(
  variant: HttpTypes.StoreProductVariant | undefined,
  stockMode: ProductStockMode
): string | null {
  if (!variant) {
    return null
  }
  if (stockMode === "no_stock") {
    return "Available on request"
  }
  if (!variant.manage_inventory) {
    return null
  }
  const qty = variant.inventory_quantity ?? 0
  if (stockMode === "track_hidden") {
    if (variant.allow_backorder && qty <= 0) {
      return "Backorder available"
    }
    return qty > 0 ? "In stock" : "Out of stock"
  }
  if (variant.allow_backorder && qty <= 0) {
    return "Backorder available"
  }
  return qty > 0 ? `${qty} in stock` : "Out of stock"
}
