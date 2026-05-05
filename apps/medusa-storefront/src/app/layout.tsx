import { getLocale } from "@lib/data/locale-actions"
import { getTextDirection } from "@lib/i18n"
import { getBaseURL } from "@lib/util/env"
import { getStoreCurrencyConfig } from "@lib/data/currency"
import {
  DEFAULT_THEME,
  isTheme,
  THEME_COOKIE_NAME,
} from "@lib/theme"
import { Metadata } from "next"
import { cookies } from "next/headers"
import { ThemeProvider } from "@lib/context/theme-context"
import { ToastProvider } from "@lib/context/toast-context"
import { CurrencyProvider } from "@lib/context/currency-context"
import { UiLocaleProvider } from "@lib/context/ui-locale-context"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const locale = (await getLocale()) ?? "en"
  const dir = getTextDirection(locale)
  const currencyConfig = await getStoreCurrencyConfig()
  const cookieStore = await cookies()
  const cookieTheme = cookieStore.get(THEME_COOKIE_NAME)?.value
  const initialTheme = isTheme(cookieTheme) ? cookieTheme : DEFAULT_THEME

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={initialTheme}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="antialiased" suppressHydrationWarning>
        <UiLocaleProvider locale={locale}>
          <ThemeProvider>
            <CurrencyProvider initialConfig={currencyConfig}>
              <ToastProvider>
                <main className="relative min-h-screen overflow-x-clip">
                  {props.children}
                </main>
              </ToastProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </UiLocaleProvider>
      </body>
    </html>
  )
}
