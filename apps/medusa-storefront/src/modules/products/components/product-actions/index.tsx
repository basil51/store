"use client"

import { addToCart } from "@lib/data/cart"
import { useCurrency } from "@lib/context/currency-context"
import { useIntersection } from "@lib/hooks/use-in-view"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  trackPresetAddedToCart,
  trackPresetSelected,
  trackWhatsAppContinueClicked,
  trackWhatsAppMessageCopied,
  trackWhatsAppPreviewOpened,
  type PresetSelectionSource,
  type WhatsAppFunnelPayload,
} from "@lib/util/analytics"
import {
  getPreferredResolvedProductVariantCombination,
  optionsAsKeymap,
  type ResolvedProductVariantCombination,
  resolveProductVariantCombinations,
} from "@lib/util/variant-combinations"
import {
  getVariantMaxOrderQuantity,
  isVariantPurchasable,
  parseProductStockMode,
} from "@lib/util/stock-mode"
import {
  buildLocalizedWhatsAppProductLine,
  buildLocalizedWhatsAppSelectionDetailsText,
} from "@lib/util/whatsapp-product-summary"
import {
  applyWhatsAppTemplate,
  buildWhatsAppCustomerNote,
  getWhatsAppTemplateForLocale,
} from "@lib/util/whatsapp"
import { useToast } from "@lib/context/toast-context"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import type { StorefrontSettings } from "@lib/types/storefront-settings"
import { HttpTypes } from "@medusajs/types"
import Divider from "@modules/common/components/divider"
import WhatsAppPreviewModal from "@modules/common/components/whatsapp-preview-modal"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import VariantStockStatus from "../variant-stock-status"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  storeSettings?: StorefrontSettings
  disabled?: boolean
  selectedVariantId?: string
  selectedPresetKey?: string
}

export default function ProductActions({
  product,
  disabled,
  storeSettings,
  selectedVariantId,
  selectedPresetKey,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [isWhatsAppPreviewOpen, setIsWhatsAppPreviewOpen] = useState(false)
  const [whatsAppPreviewMessage, setWhatsAppPreviewMessage] = useState("")
  const [whatsAppCustomerNote, setWhatsAppCustomerNote] = useState("")
  const [didInitializeOptionSelection, setDidInitializeOptionSelection] =
    useState(false)
  const whatsAppPreviewAnalyticsRef = useRef<WhatsAppFunnelPayload | null>(null)
  const countryCode = useParams().countryCode as string

  const validVariantCombinations = useMemo(
    () =>
      resolveProductVariantCombinations(
        product,
        storeSettings?.variantCombinationDefaultsByType
      ),
    [product, storeSettings?.variantCombinationDefaultsByType]
  )

  const guidedVariantCombinations = useMemo(
    () =>
      [...validVariantCombinations].sort((left, right) => {
        if (left.isDefault === right.isDefault) {
          return left.title.localeCompare(right.title)
        }

        return left.isDefault ? -1 : 1
      }),
    [validVariantCombinations]
  )

  const preferredVariantCombination = useMemo(
    () =>
      getPreferredResolvedProductVariantCombination(
        product,
        storeSettings?.variantCombinationDefaultsByType
      ),
    [product, storeSettings?.variantCombinationDefaultsByType]
  )

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    const presetVariant = selectedVariantId
      ? product.variants?.find((variant) => variant.id === selectedVariantId)
      : undefined

    if (presetVariant) {
      const variantOptions = optionsAsKeymap(presetVariant.options)

      setOptions((current) =>
        isEqual(current, variantOptions) ? current : variantOptions
      )
      setDidInitializeOptionSelection(true)
      return
    }

    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions((current) =>
        isEqual(current, variantOptions) ? current : variantOptions
      )
    }

    setDidInitializeOptionSelection(true)
  }, [product.variants, selectedVariantId])

  const normalizedOptions = useMemo(
    () =>
      Object.entries(options).reduce<Record<string, string>>((acc, [optionId, value]) => {
        if (typeof value === "string" && value) {
          acc[optionId] = value
        }

        return acc
      }, {}),
    [options]
  )

  const activeVariantCombination = useMemo(
    () => {
      const byCurrentOptions = validVariantCombinations.find((combination) =>
        isEqual(normalizedOptions, combination.mappedOptionValues)
      )

      if (byCurrentOptions) {
        return byCurrentOptions
      }

      if (!didInitializeOptionSelection && selectedPresetKey) {
        return validVariantCombinations.find(
          (combination) => combination.key === selectedPresetKey
        )
      }

      return undefined
    },
    [
      didInitializeOptionSelection,
      normalizedOptions,
      selectedPresetKey,
      validVariantCombinations,
    ]
  )

  const isPreferredCombinationActive =
    !!preferredVariantCombination &&
    preferredVariantCombination.key === activeVariantCombination?.key

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    if (product.variants.length === 1 && Object.keys(normalizedOptions).length === 0) {
      return product.variants[0]
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, normalizedOptions)
    })
  }, [normalizedOptions, product.variants])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const handleVariantCombinationSelect = (
    combination: ResolvedProductVariantCombination,
    source: PresetSelectionSource
  ) => {
    trackPresetSelected({
      source,
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

    setOptions(combination.mappedOptionValues)
  }

  const handleRestoreDefaultPreset = () => {
    if (!preferredVariantCombination) {
      return
    }

    handleVariantCombinationSelect(preferredVariantCombination, "restore_default")
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    if (
      (product.variants?.length ?? 0) === 1 &&
      Object.keys(normalizedOptions).length === 0
    ) {
      return true
    }

    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, normalizedOptions)
    })
  }, [normalizedOptions, product.variants])

  useEffect(() => {
    if (!didInitializeOptionSelection) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    const variantIdValue = isValidVariant ? selectedVariant?.id ?? null : null
    const presetKeyValue = activeVariantCombination?.key ?? null
    let hasChanged = false

    if (params.get("v_id") !== variantIdValue) {
      if (variantIdValue) {
        params.set("v_id", variantIdValue)
      } else {
        params.delete("v_id")
      }

      hasChanged = true
    }

    if (params.get("preset") !== presetKeyValue) {
      if (presetKeyValue) {
        params.set("preset", presetKeyValue)
      } else {
        params.delete("preset")
      }

      hasChanged = true
    }

    if (!hasChanged) {
      return
    }

    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextUrl)
  }, [
    activeVariantCombination?.key,
    didInitializeOptionSelection,
    isValidVariant,
    pathname,
    router,
    searchParams,
    selectedVariant?.id,
  ])

  const stockMode = useMemo(
    () =>
      parseProductStockMode(
        product.metadata,
        storeSettings?.defaultStockMode
      ),
    [product.metadata, storeSettings?.defaultStockMode]
  )

  const inStock = useMemo(
    () => isVariantPurchasable(selectedVariant, stockMode),
    [selectedVariant, stockMode]
  )

  const maxOrderQuantity = useMemo(() => {
    return getVariantMaxOrderQuantity(selectedVariant, stockMode)
  }, [selectedVariant, stockMode])

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, maxOrderQuantity)))
  }, [maxOrderQuantity, selectedVariant?.id])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")
  const { toast } = useToast()
  const locale = useUiLocale()

  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const { displayPrice, currency } = useCurrency()

  const price = useMemo(() => {
    return getProductPrice({
      product,
      variantId: selectedVariant?.id,
    })
  }, [product, selectedVariant?.id])

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }

    return price.variantPrice || price.cheapestPrice || null
  }, [price])

  const freeShippingThreshold = storeSettings?.freeShippingThreshold
  const showFreeShippingTeaser =
    typeof freeShippingThreshold === "number" && freeShippingThreshold > 0
  const selectedUnitAmount = selectedPrice?.calculated_price_number ?? 0
  const selectedItemAmount = selectedUnitAmount * quantity
  const freeShippingRemaining = showFreeShippingTeaser
    ? Math.max(freeShippingThreshold - selectedItemAmount, 0)
    : 0
  const reachesFreeShippingWithThisItem =
    showFreeShippingTeaser && selectedItemAmount > 0 && freeShippingRemaining === 0

  const showWhatsApp =
    !!storeSettings?.whatsappNumber &&
    (storeSettings.cartMode === "whatsapp" || storeSettings.cartMode === "both")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
        metadata: activeVariantCombination
          ? {
              variant_combination_key: activeVariantCombination.key,
              variant_combination_title: activeVariantCombination.title,
              ...(activeVariantCombination.badge
                ? { variant_combination_badge: activeVariantCombination.badge }
                : {}),
              ...(activeVariantCombination.isDefault
                ? { variant_combination_is_default: true }
                : {}),
              variant_combination_option_values:
                activeVariantCombination.optionValues,
            }
          : undefined,
      })

      if (activeVariantCombination) {
        trackPresetAddedToCart({
          preset_key: activeVariantCombination.key,
          preset_title: activeVariantCombination.title,
          preset_badge: activeVariantCombination.badge,
          preset_is_default: activeVariantCombination.isDefault,
          option_values: activeVariantCombination.optionValues,
          product_id: product.id,
          product_handle: product.handle,
          product_title: product.title,
          variant_id: selectedVariant.id,
          quantity,
          currency_code: currency,
          amount: selectedPrice ? selectedItemAmount : undefined,
        })
      }

      toast(t("commonAddedToCart"), "teal")
    } catch {
      toast(t("commonAddToCartFailed"), "amber")
    } finally {
      setIsAdding(false)
    }
  }

  const handleWhatsAppOrder = () => {
    if (!selectedVariant?.id || !storeSettings?.whatsappNumber) {
      return
    }

    const selectedSpecsText = buildLocalizedWhatsAppSelectionDetailsText({
      product,
      variantOptions: selectedVariant.options,
      locale,
      presetTitle: activeVariantCombination?.title,
      setupLabel: t("whatsappMessageSetupLabel"),
    })

    const unitPriceText = selectedPrice ? displayPrice(selectedUnitAmount) : ""
    const lineTotalText = selectedPrice ? displayPrice(selectedItemAmount) : ""

    const itemLine = buildLocalizedWhatsAppProductLine({
      title: product.title,
      product,
      variantOptions: selectedVariant.options,
      locale,
      presetTitle: activeVariantCombination?.title,
      setupLabel: t("whatsappMessageSetupLabel"),
      priceText: unitPriceText,
    })

    const whatsappTemplate = getWhatsAppTemplateForLocale({
      templates: storeSettings.whatsappTemplates,
      locale,
      fallbackTemplate: storeSettings.whatsappTemplate,
    })

    const customerNote = buildWhatsAppCustomerNote({
      note: whatsAppCustomerNote,
      label: t("whatsappCustomerNoteMessageLabel"),
    })

    const renderedMessage = applyWhatsAppTemplate({
      template: whatsappTemplate,
      replacements: {
        items: `${quantity}x ${itemLine}`,
        total: lineTotalText,
        currency,
        store_name: storeSettings.storeName ?? "",
        product_name: product.title,
        product_specs: selectedSpecsText,
        quantity,
        unit_price: unitPriceText,
        line_total: lineTotalText,
        preset_title: activeVariantCombination?.title ?? "",
        customer_note: customerNote,
      },
    })

    const message =
      customerNote && !/\{\{\s*customer_note\s*\}\}/.test(whatsappTemplate)
        ? `${renderedMessage}\n${customerNote}`
        : renderedMessage

    whatsAppPreviewAnalyticsRef.current = {
      source: "product_page",
      locale,
      message_length: message.length,
      currency_code: currency,
      quantity,
      product_id: product.id,
      product_handle: product.handle,
      product_title: product.title,
      variant_id: selectedVariant.id,
      preset_key: activeVariantCombination?.key,
      preset_title: activeVariantCombination?.title,
    }
    setWhatsAppPreviewMessage(message)
    setIsWhatsAppPreviewOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-y-4" ref={actionsRef}>
        <div>
          {guidedVariantCombinations.length ? (
            <div className="flex flex-col gap-y-3 mb-4">
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {t("productActionsGuidedPresets")}
              </span>
              <div className="grid grid-cols-1 gap-3">
                {guidedVariantCombinations.map((combination) => {
                  const isActive = activeVariantCombination?.key === combination.key
                  const isCombinationAvailable = !!combination.matchingVariant

                  return (
                    <button
                      key={combination.key}
                      type="button"
                      onClick={() =>
                        handleVariantCombinationSelect(
                          combination,
                          "guided_presets"
                        )
                      }
                      className="rounded-2xl p-4 [text-align:start] transition-all duration-200"
                      style={{
                        background: isActive
                          ? "rgba(0, 229, 200, 0.08)"
                          : "var(--surface2)",
                        border: `1px solid ${
                          isActive ? "var(--teal)" : "var(--border)"
                        }`,
                        opacity: isCombinationAvailable ? 1 : 0.7,
                      }}
                      disabled={!!disabled || isAdding || !isCombinationAvailable}
                      data-testid="pdp-variant-combination"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className="text-sm font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {combination.title}
                          </span>
                          {combination.summary ? (
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {combination.summary}
                            </span>
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
                            {t("productActionsDefaultSetup")}
                          </span>
                        ) : null}
                        {isActive ? (
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
                            style={{
                              background: "rgba(255, 255, 255, 0.06)",
                              color: "var(--text)",
                            }}
                          >
                            {t("productActionsCurrent")}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                      {!isCombinationAvailable ? (
                        <p className="mt-2 text-xs" style={{ color: "var(--coral)" }}>
                          {t("productActionsPresetUnavailable")}
                        </p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {preferredVariantCombination ? (
                <div
                  className="rounded-2xl px-4 py-3 flex flex-col gap-2"
                  style={{
                    background: isPreferredCombinationActive
                      ? "rgba(255, 196, 0, 0.08)"
                      : "var(--surface2)",
                    border: `1px solid ${
                      isPreferredCombinationActive ? "#f59e0b" : "var(--border)"
                    }`,
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {isPreferredCombinationActive
                      ? `${
                          preferredVariantCombination.isDefault
                            ? t("productActionsDefaultSetupActive")
                            : t("productActionsRecommendedSetupActive")
                        }: ${preferredVariantCombination.title}`
                      : `${
                          preferredVariantCombination.isDefault
                            ? t("productActionsPreferDefaultSetup")
                            : t("productActionsPreferRecommendedSetup")
                        } ${preferredVariantCombination.title}`}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                    {isPreferredCombinationActive
                      ? t("productActionsActiveSetupDescription")
                      : t("productActionsRestoreSetupDescription")}
                  </p>
                  {!isPreferredCombinationActive ? (
                    <div>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultPreset}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{
                          background: "rgba(255, 196, 0, 0.14)",
                          color: "#b45309",
                          border: "1px solid rgba(245, 158, 11, 0.45)",
                        }}
                        disabled={!!disabled || isAdding}
                      >
                        {preferredVariantCombination.isDefault
                          ? t("productActionsRestoreDefaultSetup")
                          : t("productActionsRestoreRecommendedSetup")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Divider />
            </div>
          ) : null}

          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />
        <VariantStockStatus
          product={product}
          variant={selectedVariant}
          defaultStockMode={storeSettings?.defaultStockMode}
        />

        {selectedVariant ? (
          <div
            className="flex items-center justify-between rounded-2xl p-4"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
            }}
            data-testid="product-quantity-selector"
          >
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {t("productActionsQuantity")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={quantity <= 1 || !!disabled || isAdding}
                className="h-10 w-10 rounded-full text-lg font-bold"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color:
                    quantity <= 1 || disabled || isAdding
                      ? "var(--text-dim)"
                      : "var(--text)",
                  cursor:
                    quantity <= 1 || disabled || isAdding
                      ? "not-allowed"
                      : "pointer",
                }}
                aria-label={t("productActionsDecreaseQuantity")}
                data-testid="product-quantity-decrease"
              >
                -
              </button>
              <span
                className="min-w-10 text-center text-base font-semibold"
                style={{ color: "var(--text)" }}
                data-testid="product-quantity-value"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.min(maxOrderQuantity, current + 1))
                }
                disabled={quantity >= maxOrderQuantity || !!disabled || isAdding}
                className="h-10 w-10 rounded-full text-lg font-bold"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color:
                    quantity >= maxOrderQuantity || disabled || isAdding
                      ? "var(--text-dim)"
                      : "var(--text)",
                  cursor:
                    quantity >= maxOrderQuantity || disabled || isAdding
                      ? "not-allowed"
                      : "pointer",
                }}
                aria-label={t("productActionsIncreaseQuantity")}
                data-testid="product-quantity-increase"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        {showWhatsApp && selectedVariant ? (
          <div
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
            }}
          >
            <label
              htmlFor="product-whatsapp-note"
              className="text-sm font-bold"
              style={{ color: "var(--text)" }}
            >
              {t("whatsappCustomerNoteFieldLabel")}
            </label>
            <textarea
              id="product-whatsapp-note"
              value={whatsAppCustomerNote}
              onChange={(event) => setWhatsAppCustomerNote(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                resize: "vertical",
              }}
              placeholder={t("whatsappCustomerNoteFieldPlaceholder")}
              data-testid="product-whatsapp-note-input"
            />
            <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
              {t("whatsappCustomerNoteFieldHint")}
            </p>
          </div>
        ) : null}

        {showFreeShippingTeaser && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: reachesFreeShippingWithThisItem
                ? "rgba(0, 229, 200, 0.08)"
                : "var(--surface2)",
              border: `1px solid ${
                reachesFreeShippingWithThisItem ? "var(--teal)" : "var(--border)"
              }`,
            }}
            data-testid="pdp-free-shipping-teaser"
          >
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {reachesFreeShippingWithThisItem
                ? t("productActionsQualifiesFreeShipping")
                : t("productActionsFreeShippingStartsAt", {
                    amount: displayPrice(freeShippingThreshold),
                  })}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
              {selectedItemAmount > 0
                ? reachesFreeShippingWithThisItem
                  ? t("productActionsAddingReachesThreshold")
                  : t("productActionsSelectionAway", {
                      amount: displayPrice(freeShippingRemaining),
                    })
                : t("productActionsSelectVariantCompareThreshold")}
            </p>
          </div>
        )}

        {storeSettings?.cartMode !== "whatsapp" && (
          <button
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              !selectedVariant ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            className="h-12 w-full rounded-full text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background:
                !inStock || !isValidVariant || !selectedVariant
                  ? "var(--surface2)"
                  : "var(--teal)",
              color:
                !inStock || !isValidVariant || !selectedVariant
                  ? "var(--text-dim)"
                  : "#000",
              boxShadow:
                !inStock || !isValidVariant || !selectedVariant
                  ? "none"
                  : "var(--glow-teal)",
              border: "none",
              cursor:
                !inStock || !selectedVariant || disabled || isAdding || !isValidVariant
                  ? "not-allowed"
                  : "pointer",
            }}
            data-testid="add-product-button"
          >
            {isAdding
              ? t("commonAdding")
              : !selectedVariant && Object.keys(normalizedOptions).length === 0
              ? t("commonSelectVariant")
              : !inStock || !isValidVariant
              ? t("commonOutOfStock")
              : t("commonAddToCart")}
          </button>
        )}

        {showWhatsApp && (
          <button
            onClick={handleWhatsAppOrder}
            disabled={
              !inStock ||
              !selectedVariant ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            className="h-12 w-full rounded-full text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background:
                !inStock || !isValidVariant || !selectedVariant
                  ? "var(--surface2)"
                  : "#25D366",
              color:
                !inStock || !isValidVariant || !selectedVariant
                  ? "var(--text-dim)"
                  : "#052e16",
              border: "none",
              cursor:
                !inStock || !selectedVariant || disabled || isAdding || !isValidVariant
                  ? "not-allowed"
                  : "pointer",
            }}
            data-testid="product-whatsapp-button"
          >
            {!selectedVariant && Object.keys(normalizedOptions).length === 0
              ? t("commonSelectVariant")
              : !inStock || !isValidVariant
              ? t("commonOutOfStock")
              : t("productActionsOrderOnWhatsApp")}
          </button>
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          handleWhatsAppOrder={handleWhatsAppOrder}
          cartMode={storeSettings?.cartMode ?? "standard"}
          showWhatsApp={showWhatsApp}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
      <WhatsAppPreviewModal
        isOpen={isWhatsAppPreviewOpen}
        close={() => setIsWhatsAppPreviewOpen(false)}
        message={whatsAppPreviewMessage}
        phoneNumber={storeSettings?.whatsappNumber ?? ""}
        onOpen={() => {
          if (whatsAppPreviewAnalyticsRef.current) {
            trackWhatsAppPreviewOpened(whatsAppPreviewAnalyticsRef.current)
          }
        }}
        onCopy={() => {
          if (whatsAppPreviewAnalyticsRef.current) {
            trackWhatsAppMessageCopied(whatsAppPreviewAnalyticsRef.current)
          }
        }}
        onContinue={() => {
          if (whatsAppPreviewAnalyticsRef.current) {
            trackWhatsAppContinueClicked(whatsAppPreviewAnalyticsRef.current)
          }
        }}
      />
    </>
  )
}
