"use client"

import { getPercentageDiff } from "@lib/util/get-percentage-diff"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { useCurrency } from "@lib/context/currency-context"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
}

const LineItemPrice = ({
  item,
  style = "default",
}: LineItemPriceProps) => {
  const { total, original_total } = item
  const originalPrice = original_total
  const currentPrice = total
  const hasReducedPrice = currentPrice < originalPrice
  const { displayPrice } = useCurrency()

  return (
    <div className="flex flex-col gap-x-2 text-ui-fg-subtle items-end">
      <div style={{ textAlign: "start" }}>
        {hasReducedPrice && (
          <>
            <p>
              {style === "default" && (
                <span className="text-ui-fg-subtle">Original: </span>
              )}
              <span
                className="line-through text-ui-fg-muted"
                data-testid="product-original-price"
              >
                {displayPrice(originalPrice)}
              </span>
            </p>
            {style === "default" && (
              <span className="text-ui-fg-interactive">
                -{getPercentageDiff(originalPrice, currentPrice || 0)}%
              </span>
            )}
          </>
        )}
        <span
          className={clx("text-base-regular", {
            "text-ui-fg-interactive": hasReducedPrice,
          })}
          data-testid="product-price"
        >
          {displayPrice(currentPrice)}
        </span>
      </div>
    </div>
  )
}

export default LineItemPrice
