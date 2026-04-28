import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import RecommendedSetups from "@modules/products/components/recommended-setups"
import ProductTabs from "@modules/products/components/product-tabs"
import ProductVideo from "@modules/products/components/product-video"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import type { StorefrontSettings } from "@lib/types/storefront-settings"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  storeSettings?: StorefrontSettings
  selectedVariantId?: string
  selectedPresetKey?: string
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  storeSettings,
  selectedVariantId,
  selectedPresetKey,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      <div
        className="content-container relative py-8 small:py-10"
        data-testid="product-container"
      >
        <div className="grid gap-8 large:grid-cols-[minmax(0,1fr)_380px]">
          {/* Gallery + optional video — full-width on mobile, left on desktop */}
          <div className="block w-full">
            <ImageGallery images={images} />
            <ProductVideo product={product} />
            <div className="mt-4">
              <RecommendedSetups
                product={product}
                storeSettings={storeSettings}
                selectedVariantId={selectedVariantId}
                selectedPresetKey={selectedPresetKey}
              />
            </div>
          </div>

          {/* Sidebar: info + actions */}
          <div className="flex flex-col gap-4 large:sticky large:top-24 large:h-fit">
            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <ProductInfo product={product} />
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <ProductOnboardingCta />
              <Suspense
                fallback={
                  <ProductActions
                    disabled={true}
                    product={product}
                    region={region}
                    storeSettings={storeSettings}
                    selectedVariantId={selectedVariantId}
                    selectedPresetKey={selectedPresetKey}
                  />
                }
              >
                <ProductActionsWrapper
                  id={product.id}
                  region={region}
                  selectedVariantId={selectedVariantId}
                  selectedPresetKey={selectedPresetKey}
                />
              </Suspense>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <ProductTabs product={product} selectedVariantId={selectedVariantId} />
            </div>
          </div>
        </div>
      </div>
      <div
        className="content-container my-16 small:my-24"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
