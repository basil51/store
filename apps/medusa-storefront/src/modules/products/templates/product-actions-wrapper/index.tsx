import { listProducts } from "@lib/data/products"
import { getStorefrontSettings } from "@lib/data/currency"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  selectedVariantId,
  selectedPresetKey,
}: {
  id: string
  region: HttpTypes.StoreRegion
  selectedVariantId?: string
  selectedPresetKey?: string
}) {
  const storeSettings = await getStorefrontSettings()
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  return (
    <ProductActions
      product={product}
      region={region}
      storeSettings={storeSettings}
      selectedVariantId={selectedVariantId}
      selectedPresetKey={selectedPresetKey}
    />
  )
}
