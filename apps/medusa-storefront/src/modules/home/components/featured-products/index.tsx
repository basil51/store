import { getStorefrontSettings } from "@lib/data/currency"
import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/featured-products/product-rail"

export default async function FeaturedProducts({
  collections,
  region,
}: {
  collections: HttpTypes.StoreCollection[]
  region: HttpTypes.StoreRegion
}) {
  const storeSettings = await getStorefrontSettings()

  return collections.map((collection, index) => (
    <li key={collection.id}>
      <ProductRail
        collection={collection}
        region={region}
        index={index}
        defaultStockMode={storeSettings.defaultStockMode}
      />
    </li>
  ))
}
