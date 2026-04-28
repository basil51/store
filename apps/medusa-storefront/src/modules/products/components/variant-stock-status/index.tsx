"use client"

import { Text } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy } from "@lib/ui-copy"
import {
  getVariantStockLabel,
  type ProductStockMode,
  parseProductStockMode,
} from "@lib/util/stock-mode"

type Props = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  defaultStockMode?: ProductStockMode
}

export default function VariantStockStatus({
  product,
  variant,
  defaultStockMode,
}: Props) {
  const locale = useUiLocale()
  const mode = parseProductStockMode(product.metadata, defaultStockMode)
  const label = getVariantStockLabel(variant, mode, {
    availableOnRequest: getUiCopy(locale, "stockAvailableOnRequest"),
    inStock: getUiCopy(locale, "stockInStock"),
    backorderAvailable: getUiCopy(locale, "stockBackorderAvailable"),
    outOfStock: getUiCopy(locale, "commonOutOfStock"),
    countInStock: (quantity) =>
      getUiCopy(locale, "stockCountInStock", { quantity }),
  })

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
