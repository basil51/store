import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  const optionHighlights = (product.options || [])
    .map((option) => option.title)
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div id="product-info">
      <div className="mx-auto flex flex-col gap-y-5 lg:max-w-[500px]">
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="w-fit"
          >
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors"
              style={{
                background: "rgba(0,229,200,0.1)",
                color: "var(--teal)",
                border: "1px solid rgba(0,229,200,0.25)",
              }}
            >
              {product.collection.title}
            </span>
          </LocalizedClientLink>
        )}
        <Heading
          level="h2"
          className="font-syne text-4xl font-bold leading-tight tracking-tight small:text-5xl"
          style={{ color: "var(--text)" }}
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        {optionHighlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {optionHighlights.map((highlight) => (
              <span
                key={highlight}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--surface2)",
                  color: "var(--text-dim)",
                  border: "1px solid var(--border)",
                }}
              >
                {highlight}
              </span>
            ))}
          </div>
        )}

        <Text
          className="whitespace-pre-line text-base leading-7"
          style={{ color: "var(--text-dim)" }}
          data-testid="product-description"
        >
          {product.description}
        </Text>
      </div>
    </div>
  )
}

export default ProductInfo
