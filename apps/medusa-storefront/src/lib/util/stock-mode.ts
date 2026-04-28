import type { HttpTypes } from "@medusajs/types"

/**
 * Matches `DB.md` / roadmap stock modes. Set on the product in Admin → Metadata → `stock_mode`.
 */
export type ProductStockMode =
  | "track_visible"
  | "track_hidden"
  | "no_stock"

export type ProductStockSummaryState =
  | "available_on_request"
  | "in_stock"
  | "backorder_available"
  | "out_of_stock"

export type ProductStockSummary = {
  label: string
  state: ProductStockSummaryState
}

export type StockLabelCopy = {
  availableOnRequest: string
  inStock: string
  backorderAvailable: string
  outOfStock: string
  countInStock: (quantity: number) => string
}

const MODES: ProductStockMode[] = [
  "track_visible",
  "track_hidden",
  "no_stock",
]

export const DEFAULT_MAX_ORDER_QUANTITY = 10

const DEFAULT_STOCK_LABEL_COPY: StockLabelCopy = {
  availableOnRequest: "Available on request",
  inStock: "In stock",
  backorderAvailable: "Backorder available",
  outOfStock: "Out of stock",
  countInStock: (quantity) => `${quantity} in stock`,
}

const resolveStockLabelCopy = (
  copy?: Partial<StockLabelCopy>
): StockLabelCopy => ({
  ...DEFAULT_STOCK_LABEL_COPY,
  ...copy,
})

export function parseProductStockMode(
  metadata?: Record<string, unknown> | null,
  fallbackMode: ProductStockMode = "track_visible"
): ProductStockMode {
  const raw = metadata?.stock_mode
  if (typeof raw === "string" && MODES.includes(raw as ProductStockMode)) {
    return raw as ProductStockMode
  }
  return MODES.includes(fallbackMode) ? fallbackMode : "track_visible"
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

export function getVariantMaxOrderQuantity(
  variant: HttpTypes.StoreProductVariant | undefined,
  stockMode: ProductStockMode,
  fallbackMaxQuantity = DEFAULT_MAX_ORDER_QUANTITY
): number {
  if (!variant) {
    return fallbackMaxQuantity
  }

  if (
    stockMode === "no_stock" ||
    !variant.manage_inventory ||
    variant.allow_backorder
  ) {
    return fallbackMaxQuantity
  }

  return Math.max(
    1,
    Math.min(variant.inventory_quantity ?? 1, fallbackMaxQuantity)
  )
}

/**
 * Human-readable stock line for PDP. Returns `null` to hide the row entirely.
 */
export function getVariantStockLabel(
  variant: HttpTypes.StoreProductVariant | undefined,
  stockMode: ProductStockMode,
  copy?: Partial<StockLabelCopy>
): string | null {
  const labels = resolveStockLabelCopy(copy)

  if (!variant) {
    return null
  }
  if (stockMode === "no_stock") {
    return labels.availableOnRequest
  }
  if (!variant.manage_inventory) {
    return null
  }
  const qty = variant.inventory_quantity ?? 0
  if (stockMode === "track_hidden") {
    if (variant.allow_backorder && qty <= 0) {
      return labels.backorderAvailable
    }
    return qty > 0 ? labels.inStock : labels.outOfStock
  }
  if (variant.allow_backorder && qty <= 0) {
    return labels.backorderAvailable
  }
  return qty > 0 ? labels.countInStock(qty) : labels.outOfStock
}

export function getProductStockSummary(
  product: HttpTypes.StoreProduct | undefined,
  stockMode: ProductStockMode,
  copy?: Partial<StockLabelCopy>
): ProductStockSummary | null {
  const labels = resolveStockLabelCopy(copy)

  if (!product) {
    return null
  }

  if (stockMode === "no_stock") {
    return {
      label: labels.availableOnRequest,
      state: "available_on_request",
    }
  }

  const variants = product.variants ?? []

  if (!variants.length) {
    return null
  }

  const trackedVariants = variants.filter((variant) => variant.manage_inventory)

  if (!trackedVariants.length) {
    return null
  }

  const hasInventoryQuantity = trackedVariants.some((variant) =>
    Object.prototype.hasOwnProperty.call(variant, "inventory_quantity")
  )

  if (!hasInventoryQuantity) {
    return null
  }

  const totalQuantity = trackedVariants.reduce(
    (sum, variant) => sum + Math.max(0, variant.inventory_quantity ?? 0),
    0
  )

  if (totalQuantity > 0) {
    return {
      label:
        stockMode === "track_hidden"
          ? labels.inStock
          : labels.countInStock(totalQuantity),
      state: "in_stock",
    }
  }

  const hasBackorder = trackedVariants.some(
    (variant) => variant.allow_backorder && (variant.inventory_quantity ?? 0) <= 0
  )

  if (hasBackorder) {
    return {
      label: labels.backorderAvailable,
      state: "backorder_available",
    }
  }

  return {
    label: labels.outOfStock,
    state: "out_of_stock",
  }
}
