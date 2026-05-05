"use client"

import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy } from "@lib/ui-copy"
import { getProductPrice } from "@lib/util/get-product-price"
import { useCurrency } from "@lib/context/currency-context"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })
  const { displayPrice } = useCurrency()
  const locale = useUiLocale()

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-gray-100 animate-pulse" />
  }

  const isSale = selectedPrice.price_type === "sale"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3">
        <span
          className="text-2xl font-black"
          style={{ color: isSale ? "var(--coral)" : "var(--teal)" }}
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {!variant && getUiCopy(locale, "productPriceFrom")}
          {displayPrice(selectedPrice.calculated_price_number)}
        </span>
        {isSale && (
          <span
            className="text-base line-through"
            style={{ color: "var(--text-dim)" }}
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {displayPrice(selectedPrice.original_price_number)}
          </span>
        )}
        {isSale && selectedPrice.percentage_diff && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-black"
            style={{ background: "var(--coral)", color: "#fff" }}
          >
            -{selectedPrice.percentage_diff}%
          </span>
        )}
      </div>
    </div>
  )
}
