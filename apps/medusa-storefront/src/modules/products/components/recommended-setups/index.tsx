"use client"

import type { StorefrontSettings } from "@lib/types/storefront-settings"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { trackPresetSelected } from "@lib/util/analytics"
import {
  getPreferredResolvedProductVariantCombination,
  resolveProductVariantCombinations,
} from "@lib/util/variant-combinations"

type RecommendedSetupsProps = {
  product: HttpTypes.StoreProduct
  storeSettings?: StorefrontSettings
  selectedVariantId?: string
  selectedPresetKey?: string
}

const RecommendedSetups = ({
  product,
  storeSettings,
  selectedVariantId,
  selectedPresetKey,
}: RecommendedSetupsProps) => {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const combinations = resolveProductVariantCombinations(
    product,
    storeSettings?.variantCombinationDefaultsByType
  ).filter((combination) => !!combination.matchingVariant)

  const preferredCombination = getPreferredResolvedProductVariantCombination(
    product,
    storeSettings?.variantCombinationDefaultsByType
  )

  combinations.sort((left, right) => {
    const leftIsPreferred = preferredCombination?.key === left.key
    const rightIsPreferred = preferredCombination?.key === right.key

    if (leftIsPreferred !== rightIsPreferred) {
      return leftIsPreferred ? -1 : 1
    }

    if (left.isDefault === right.isDefault) {
      return left.title.localeCompare(right.title)
    }

    return left.isDefault ? -1 : 1
  })

  if (!combinations.length || !product.handle) {
    return null
  }

  const handlePresetClick = (
    combination: (typeof combinations)[number]
  ) => {
    trackPresetSelected({
      source: "recommended_setups",
      preset_key: combination.key,
      preset_title: combination.title,
      preset_badge: combination.badge,
      preset_is_default: combination.isDefault,
      option_values: combination.optionValues,
      product_id: product.id,
      product_handle: product.handle,
      product_title: product.title,
      variant_id: combination.matchingVariant?.id,
    })
  }

  return (
    <section
      className="rounded-2xl p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-dim)" }}
          >
            {t("recommendedSetupsQuickSwitch")}
          </p>
          <h3 className="font-syne text-2xl font-black" style={{ color: "var(--text)" }}>
            {t("recommendedSetupsTitle")}
          </h3>
        </div>
        <p
          className="text-sm max-w-sm"
          style={{ color: "var(--text-dim)", textAlign: "end" }}
        >
          {t("recommendedSetupsDescription")}
        </p>
      </div>

      <div className="grid gap-4 small:grid-cols-2">
        {combinations.map((combination) => {
          const isActive = selectedPresetKey
            ? combination.key === selectedPresetKey
            : combination.matchingVariant?.id === selectedVariantId

          const query = new URLSearchParams()

          if (combination.matchingVariant?.id) {
            query.set("v_id", combination.matchingVariant.id)
          }

          query.set("preset", combination.key)

          return (
            <LocalizedClientLink
              key={combination.key}
              href={`/products/${product.handle}?${query.toString()}`}
              onClick={() => handlePresetClick(combination)}
              className="rounded-2xl p-4 transition-all duration-200 block"
              style={{
                background: isActive
                  ? "rgba(0, 229, 200, 0.08)"
                  : "var(--surface2)",
                border: `1px solid ${isActive ? "var(--teal)" : "var(--border)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold" style={{ color: "var(--text)" }}>
                    {combination.title}
                  </h4>
                  {combination.summary ? (
                    <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                      {combination.summary}
                    </p>
                  ) : null}
                </div>
                {combination.badge ? (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(0, 229, 200, 0.12)",
                      color: "var(--teal)",
                    }}
                  >
                    {combination.badge}
                  </span>
                ) : null}
                {combination.isDefault ? (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(255, 196, 0, 0.12)",
                      color: "#b45309",
                    }}
                  >
                    {t("recommendedSetupsDefaultSetup")}
                  </span>
                ) : null}
                {!combination.isDefault && preferredCombination?.key === combination.key ? (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(0, 229, 200, 0.12)",
                      color: "var(--teal)",
                    }}
                  >
                    {t("recommendedSetupsRecommended")}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(combination.optionValues).map(([optionTitle, value]) => (
                  <span
                    key={`${combination.title}-${optionTitle}`}
                    className="text-[11px] px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text-dim)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {optionTitle}: {value}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "var(--text-dim)" }}>
                <span>
                  {isActive
                    ? t("recommendedSetupsCurrentSetup")
                    : combination.isDefault
                    ? t("recommendedSetupsUseDefaultSetup")
                    : preferredCombination?.key === combination.key
                    ? t("recommendedSetupsUseRecommendedSetup")
                    : t("recommendedSetupsViewThisSetup")}
                </span>
                <span>{combination.matchingVariant?.title ?? t("recommendedSetupsPresetFallback")}</span>
              </div>
            </LocalizedClientLink>
          )
        })}
      </div>
    </section>
  )
}

export default RecommendedSetups