"use client"

import { Text } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import {
  getVariantStockLabel,
  parseProductStockMode,
} from "@lib/util/stock-mode"

type Props = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}

export default function VariantStockStatus({ product, variant }: Props) {
  const mode = parseProductStockMode(product.metadata)
  const label = getVariantStockLabel(variant, mode)

  if (!label) {
    return null
  }

  return (
    <Text
      className="text-small-regular text-ui-fg-subtle"
      data-testid="variant-stock-status"
      data-stock-mode={mode}
    >
      {label}
    </Text>
  )
}
