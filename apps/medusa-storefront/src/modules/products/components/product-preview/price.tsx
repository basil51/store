import { Text } from "@medusajs/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {price.price_type === "sale" && (
        <Text
          className="text-sm line-through"
          style={{ color: "var(--text-dim)" }}
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
      <Text
        className="text-base font-semibold"
        style={{ color: price.price_type === "sale" ? "var(--coral)" : "var(--teal)" }}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
    </div>
  )
}
