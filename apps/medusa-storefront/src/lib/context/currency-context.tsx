"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import {
  DEFAULT_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
  convertAndFormat,
  type CurrencyCode,
  type CurrencyInfo,
} from "@lib/config/currencies"
import type { StoreCurrencyConfig } from "@lib/data/currency"

const STORAGE_KEY = "nx-currency"

type CurrencyContextValue = {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => void
  availableCurrencies: CurrencyInfo[]
  /** Convert a base-currency amount to the user's selected display currency */
  displayPrice: (amount: number | null | undefined) => string
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_BASE_CURRENCY,
  setCurrency: () => {},
  availableCurrencies: DEFAULT_CURRENCIES.filter((c) => c.enabled),
  displayPrice: (a) => (a ?? 0).toString(),
})

export function CurrencyProvider({
  children,
  initialConfig,
}: {
  children: ReactNode
  initialConfig?: StoreCurrencyConfig
}) {
  const [availableCurrencies] = useState<CurrencyInfo[]>(
    initialConfig?.currencies?.length
      ? initialConfig.currencies
      : DEFAULT_CURRENCIES.filter((c) => c.enabled)
  )
  const [baseCurrency] = useState<CurrencyCode>(
    initialConfig?.baseCurrency ?? DEFAULT_BASE_CURRENCY
  )
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return DEFAULT_BASE_CURRENCY
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ?? DEFAULT_BASE_CURRENCY
    } catch {
      return DEFAULT_BASE_CURRENCY
    }
  })

  // If the stored currency is no longer available, fall back to base
  useEffect(() => {
    const codes = availableCurrencies.map((c) => c.code)
    if (!codes.includes(currency)) {
      setCurrencyState(baseCurrency)
    }
  }, [availableCurrencies, baseCurrency, currency])

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {}
  }, [])

  const displayPrice = useCallback(
    (amount: number | null | undefined): string => {
      if (amount == null) return ""
      const info = availableCurrencies.find((c) => c.code === currency)
        ?? availableCurrencies[0]
        ?? DEFAULT_CURRENCIES[0]
      return convertAndFormat(amount, info)
    },
    [currency, availableCurrencies]
  )

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, availableCurrencies, displayPrice }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}

