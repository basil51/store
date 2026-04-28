import type { CurrencyCode, CurrencyInfo } from "@lib/config/currencies"
import type { UiLocale } from "@lib/ui-copy"
import type { ProductVariantCombinationDefaultsByType } from "@lib/util/variant-combinations"

export type CartMode = "standard" | "whatsapp" | "both"

export type StorefrontSettings = {
  baseCurrency: CurrencyCode
  currencies: CurrencyInfo[]
  cartMode: CartMode
  whatsappNumber: string
  whatsappTemplate: string
  whatsappTemplates: Record<UiLocale, string>
  freeShippingThreshold: number | null
  variantCombinationDefaultsByType: ProductVariantCombinationDefaultsByType
}
