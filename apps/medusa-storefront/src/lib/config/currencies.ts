/**
 * Currency configuration for frontend display conversion.
 *
 * Base currency is ILS — all prices in Medusa are stored in ILS.
 * Rates here are the static fallback defaults. The admin can override them
 * at any time via Admin → Cart Settings, which persists to store.metadata.
 *
 * rate = how many units of this currency equal 1 base currency unit
 * e.g. 1 ILS ≈ 0.27 USD → rate: 0.27
 */

export type CurrencyCode = string

export type CurrencyInfo = {
  code: CurrencyCode
  label: string
  symbol: string
  /** How many units of this currency = 1 base currency unit */
  rate: number
  enabled: boolean
}

/** Static fallback defaults — overridden at runtime by store metadata */
export const DEFAULT_CURRENCIES: CurrencyInfo[] = [
  { code: "ILS", label: "₪ ILS", symbol: "₪", rate: 1,    enabled: true },
  { code: "USD", label: "$ USD", symbol: "$", rate: 0.27,  enabled: true },
  { code: "EUR", label: "€ EUR", symbol: "€", rate: 0.25,  enabled: true },
  { code: "GBP", label: "£ GBP", symbol: "£", rate: 0.21,  enabled: false },
  { code: "JOD", label: "JD JOD", symbol: "JD", rate: 0.19, enabled: false },
]

export const DEFAULT_BASE_CURRENCY: CurrencyCode = "ILS"

/**
 * Convert an amount in the base currency to the target currency and format it.
 */
export function convertAndFormat(
  amountBase: number,
  toCurrency: CurrencyInfo,
  locale = "en-US"
): string {
  const converted = amountBase * toCurrency.rate
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: toCurrency.code,
      maximumFractionDigits: 2,
    }).format(converted)
  } catch {
    // Fallback for unknown/custom currency codes
    return `${toCurrency.symbol}${converted.toFixed(2)}`
  }
}

