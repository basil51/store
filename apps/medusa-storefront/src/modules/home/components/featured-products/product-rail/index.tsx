import { PRODUCT_PREVIEW_FIELDS } from "@lib/data/product-fields"
import { listProducts } from "@lib/data/products"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import type { ProductStockMode } from "@lib/util/stock-mode"
import { HttpTypes } from "@medusajs/types"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"

export default async function ProductRail({
  collection,
  region,
  index,
  defaultStockMode,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
  index: number
  defaultStockMode?: ProductStockMode
}) {
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: PRODUCT_PREVIEW_FIELDS,
    },
  })

  if (!pricedProducts) {
    return null
  }

  return (
    <section className="content-container py-4 small:py-6">
      <div
        className="overflow-hidden rounded-2xl px-6 py-10 small:px-10"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Section header */}
        <div
          className="mb-8 flex flex-col gap-3 border-b pb-7 small:flex-row small:items-end small:justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--teal)" }}
            >
              {t("productRailCollection")}
            </p>
            <h2
              className="mt-2 text-2xl font-bold tracking-tight small:text-3xl"
              style={{ color: "var(--text)" }}
            >
              {collection.title}
            </h2>
          </div>
          <InteractiveLink href={`/collections/${collection.handle}`}>
            {t("productRailViewAll")}
          </InteractiveLink>
        </div>

        <ul className="grid grid-cols-1 gap-4 xsmall:grid-cols-2 medium:grid-cols-3 large:grid-cols-4">
          {pricedProducts &&
            pricedProducts.map((product, index) => (
              <li key={product.id}>
                <ProductPreview
                  product={product}
                  region={region}
                  isFeatured
                  defaultStockMode={defaultStockMode}
                  imageLoading={index < 4 ? "eager" : "lazy"}
                />
              </li>
            ))}
        </ul>
      </div>
    </section>
  )
}
