"use client"

import { createContext, useContext } from "react"

const UiLocaleContext = createContext<string>("en")

type UiLocaleProviderProps = {
  locale: string
  children: React.ReactNode
}

export const UiLocaleProvider = ({
  locale,
  children,
}: UiLocaleProviderProps) => {
  return (
    <UiLocaleContext.Provider value={locale || "en"}>
      {children}
    </UiLocaleContext.Provider>
  )
}

export const useUiLocale = () => useContext(UiLocaleContext)