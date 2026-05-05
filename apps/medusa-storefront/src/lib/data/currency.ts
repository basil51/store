"use server"

import { sdk } from "@lib/config"
import {
  DEFAULT_BASE_CURRENCY,
  DEFAULT_CURRENCIES,
  type CurrencyCode,
  type CurrencyInfo,
} from "@lib/config/currencies"
import type { StorefrontSettings } from "@lib/types/storefront-settings"
import type { UiLocale } from "@lib/ui-copy"
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  normalizeWhatsAppTemplates,
} from "@lib/util/whatsapp"
import { parseProductStockMode } from "@lib/util/stock-mode"
import type { ProductVariantCombinationDefaultsByType } from "@lib/util/variant-combinations"
import { getCacheOptions } from "./cookies"

const STOREFRONT_SETTINGS_REVALIDATE_SECONDS = 300

export type StoreCurrencyConfig = {
  baseCurrency: CurrencyCode
  currencies: CurrencyInfo[]
}

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  try {
    const next = {
      ...(await getCacheOptions("storefront-settings")),
      revalidate: STOREFRONT_SETTINGS_REVALIDATE_SECONDS,
    }

    const data = await sdk.client.fetch<{
      store_name?: string
      base_currency?: string
      currencies?: CurrencyInfo[]
      cart_mode?: "standard" | "whatsapp" | "both"
      whatsapp_number?: string
      whatsapp_template?: string
      whatsapp_templates?: Partial<Record<UiLocale, string>>
      free_shipping_threshold?: number | null
      default_stock_mode?: string | null
      variant_combination_defaults_by_type?: ProductVariantCombinationDefaultsByType
    }>("/store/store-currency-config", {
      method: "GET",
      next,
      cache: "force-cache",
    })

    const currencies = Array.isArray(data?.currencies) && data.currencies.length
      ? data.currencies.filter((currency) => currency?.enabled)
      : DEFAULT_CURRENCIES.filter((currency) => currency.enabled)
    const whatsappTemplates = normalizeWhatsAppTemplates(
      data?.whatsapp_templates,
      data?.whatsapp_template
    )

    return {
      storeName: typeof data?.store_name === "string" ? data.store_name : "",
      baseCurrency:
        typeof data?.base_currency === "string"
          ? data.base_currency
          : DEFAULT_BASE_CURRENCY,
      currencies: currencies.length
        ? currencies
        : DEFAULT_CURRENCIES.filter((currency) => currency.enabled),
      cartMode:
        data?.cart_mode === "whatsapp" || data?.cart_mode === "both"
          ? data.cart_mode
          : "standard",
      whatsappNumber:
        typeof data?.whatsapp_number === "string" ? data.whatsapp_number : "",
      whatsappTemplate: whatsappTemplates.en,
      whatsappTemplates,
      freeShippingThreshold:
        typeof data?.free_shipping_threshold === "number"
          ? data.free_shipping_threshold
          : null,
      defaultStockMode: parseProductStockMode({
        stock_mode: data?.default_stock_mode,
      }),
      variantCombinationDefaultsByType:
        data?.variant_combination_defaults_by_type &&
        typeof data.variant_combination_defaults_by_type === "object" &&
        !Array.isArray(data.variant_combination_defaults_by_type)
          ? data.variant_combination_defaults_by_type
          : {},
    }
  } catch {
    return {
      storeName: "",
      baseCurrency: DEFAULT_BASE_CURRENCY,
      currencies: DEFAULT_CURRENCIES.filter((currency) => currency.enabled),
      cartMode: "standard",
      whatsappNumber: "",
      whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATES.en,
      whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
      freeShippingThreshold: null,
      defaultStockMode: "track_visible",
      variantCombinationDefaultsByType: {},
    }
  }
}

export async function getStoreCurrencyConfig(): Promise<StoreCurrencyConfig> {
  const settings = await getStorefrontSettings()
  return {
    baseCurrency: settings.baseCurrency,
    currencies: settings.currencies,
  }
}