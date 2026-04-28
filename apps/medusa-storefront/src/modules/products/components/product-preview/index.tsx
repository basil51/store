import { getProductPrice } from "@lib/util/get-product-price"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import WishlistButton from "./wishlist-button"

// Derive a badge label from product metadata or sale status
function getBadge(
  product: HttpTypes.StoreProduct,
  locale: string,
  priceDiff?: string | null
): { label: string; style: "deal" | "hot" | "new" | "top" } | null {
  const meta = product.metadata as Record<string, unknown> | null
  const raw = meta?.badge
  if (typeof raw === "string" && raw) {
    const lower = raw.toLowerCase()
    if (lower === "deal" || lower === "hot" || lower === "new" || lower === "top") {
      return { label: raw.toUpperCase(), style: lower as "deal" | "hot" | "new" | "top" }
    }
    return { label: raw.toUpperCase(), style: "new" }
  }
  if (priceDiff && parseInt(priceDiff) >= 10) {
    return { label: getUiCopy(locale, "productPreviewDeal"), style: "deal" }
  }
  return null
}

export default async function ProductPreview({
  product,
  isFeatured,
  imageLoading = "lazy",
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  imageLoading?: "lazy" | "eager"
  region: HttpTypes.StoreRegion
}) {
  const locale = (await getLocale()) ?? "en"
  const { cheapestPrice } = getProductPrice({ product })
  const badge = getBadge(product, locale, cheapestPrice?.percentage_diff)

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block"
    >
      <article
        className="nx-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-teal"
        data-testid="product-wrapper"
      >
        {/* Image */}
        <div
          className="relative overflow-hidden"
          style={{ background: "var(--surface2)" }}
        >
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            isFeatured={isFeatured}
            loading={imageLoading}
          />

          {/* Badge overlay */}
          {badge && (
            <span
              className={`badge badge-${badge.style} absolute top-2 z-10`}
              style={{ insetInlineStart: "0.5rem" }}
            >
              {badge.label}
            </span>
          )}

          {/* Discount % */}
          {cheapestPrice?.price_type === "sale" && cheapestPrice.percentage_diff && (
            <span
              className="absolute bottom-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black"
              style={{
                background: "var(--coral)",
                color: "#fff",
                insetInlineStart: "0.5rem",
              }}
            >
              -{cheapestPrice.percentage_diff}%
            </span>
          )}

          {/* Wishlist */}
          <WishlistButton productId={product.id!} />
        </div>

        {/* Info */}
        <div className="p-4">
          <p
            className="line-clamp-2 font-medium leading-snug"
            style={{ color: "var(--text)" }}
            data-testid="product-title"
          >
            {product.title}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>

          {/* Add to Cart */}
          <div
            className="mt-3 w-full translate-y-1 rounded-xl py-2 text-center text-xs font-bold opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            style={{
              border: "1px solid var(--teal)",
              color: "var(--teal)",
            }}
          >
            {getUiCopy(locale, "productPreviewViewProduct")}
          </div>
        </div>
      </article>
    </LocalizedClientLink>
  )
}

