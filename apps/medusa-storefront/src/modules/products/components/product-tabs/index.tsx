"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import {
  groupProductSpecifications,
  parseProductSpecifications,
} from "@lib/util/product-specifications"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
  selectedVariantId?: string
}

const ProductTabs = ({ product, selectedVariantId }: ProductTabsProps) => {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const specifications = parseProductSpecifications(product.metadata)

  const tabs = [
    {
      label: t("productTabsProductInformation"),
      component: <ProductInfoTab product={product} />,
    },
    ...(specifications.length
      ? [
          {
            label: t("productTabsSpecifications"),
            component: (
              <ProductSpecificationsTab
                product={product}
                selectedVariantId={selectedVariantId}
              />
            ),
          },
        ]
      : []),
    {
      label: t("productTabsShippingReturns"),
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-2 gap-x-8">
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">{t("productTabsMaterial")}</span>
            <p>{product.material ? product.material : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">{t("productTabsCountryOfOrigin")}</span>
            <p>{product.origin_country ? product.origin_country : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">{t("productTabsType")}</span>
            <p>{product.type ? product.type.value : "-"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">{t("productTabsWeight")}</span>
            <p>{product.weight ? `${product.weight} g` : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">{t("productTabsDimensions")}</span>
            <p>
              {product.length && product.width && product.height
                ? `${product.length}L x ${product.width}W x ${product.height}H`
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function resolveSelectedVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants?.length) {
    return undefined
  }

  return product.variants.find((variant) => variant.id === selectedVariantId)
}

function resolveSpecificationValues(
  specification: ReturnType<typeof parseProductSpecifications>[number],
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string,
  selectOptionLabel = ""
) {
  if (!specification.option) {
    return specification.values
  }

  const option = (product.options || []).find(
    (entry) => entry.title?.toLowerCase() === specification.option?.toLowerCase()
  )

  if (!option) {
    return specification.values
  }

  const selectedVariant = resolveSelectedVariant(product, selectedVariantId)
  const selectedValue = selectedVariant?.options?.find(
    (entry) => entry.option_id === option.id
  )?.value

  if (!selectedValue) {
    return specification.values.length
      ? specification.values
      : [selectOptionLabel]
  }

  return [selectedValue]
}

const ProductSpecificationsTab = ({
  product,
  selectedVariantId,
}: ProductTabsProps) => {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const specifications = parseProductSpecifications(product.metadata)
  const specificationGroups = groupProductSpecifications(specifications)

  if (!specifications.length) {
    return null
  }

  return (
    <div className="py-8">
      <div className="flex flex-col gap-6">
        {specificationGroups.map((group, index) => (
          <section key={group.title ?? `ungrouped-${index}`} className="flex flex-col gap-4">
            {group.title ? (
              <div>
                <span className="text-small-plus text-ui-fg-base block font-semibold uppercase tracking-[0.18em]">
                  {group.title}
                </span>
              </div>
            ) : null}
            <div className="grid gap-4 small:grid-cols-2">
              {group.items.map((specification) => (
                <div
                  key={`${group.title ?? "general"}-${specification.label}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 p-4"
                >
                  <span className="text-small-plus text-ui-fg-base block font-semibold uppercase tracking-[0.16em]">
                    {specification.label}
                  </span>
                  <p className="text-base-regular text-ui-fg-subtle mt-2">
                    {resolveSpecificationValues(
                      specification,
                      product,
                      selectedVariantId,
                      t("productTabsSelectOptionAbove")
                    ).join(", ")}
                  </p>
                  {specification.option ? (
                    <span className="text-small-regular text-ui-fg-muted mt-2 block">
                      {t("productTabsLinkedToVariantOption", {
                        option: specification.option,
                      })}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

const ShippingInfoTab = () => {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">{t("productTabsFastDelivery")}</span>
            <p className="max-w-sm">
              {t("productTabsFastDeliveryDescription")}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">{t("productTabsSimpleExchanges")}</span>
            <p className="max-w-sm">
              {t("productTabsSimpleExchangesDescription")}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Back />
          <div>
            <span className="font-semibold">{t("productTabsEasyReturns")}</span>
            <p className="max-w-sm">
              {t("productTabsEasyReturnsDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
