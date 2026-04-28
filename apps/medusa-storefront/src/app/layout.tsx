import { Syne, DM_Sans } from "next/font/google"
import { getLocale } from "@lib/data/locale-actions"
import { getTextDirection } from "@lib/i18n"
import { getBaseURL } from "@lib/util/env"
import { getStoreCurrencyConfig } from "@lib/data/currency"
import {
  DEFAULT_THEME,
  isTheme,
  THEME_BACKGROUND,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  THEME_TEXT,
} from "@lib/theme"
import { Metadata } from "next"
import { cookies } from "next/headers"
import Script from "next/script"
import { ThemeProvider } from "@lib/context/theme-context"
import { ToastProvider } from "@lib/context/toast-context"
import { CurrencyProvider } from "@lib/context/currency-context"
import { UiLocaleProvider } from "@lib/context/ui-locale-context"
import "styles/globals.css"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "600", "700", "800"],
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
  display: "swap",
})

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
  const initialBackground = THEME_BACKGROUND[initialTheme]
  const initialText = THEME_TEXT[initialTheme]

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={initialTheme}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${syne.variable} ${dmSans.variable}`}
      style={{ backgroundColor: initialBackground, color: initialText }}
    >
      <head>
        {/* Keep the root background aligned with the stored theme before hydration. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var storageKey='${THEME_STORAGE_KEY}';var cookieName='${THEME_COOKIE_NAME}';var lightBg='${THEME_BACKGROUND.light}';var darkBg='${THEME_BACKGROUND.dark}';var lightText='${THEME_TEXT.light}';var darkText='${THEME_TEXT.dark}';var t=localStorage.getItem(storageKey);var theme=t==='light'||t==='dark'?t:'${initialTheme}';var root=document.documentElement;root.setAttribute('data-theme',theme);root.style.backgroundColor=theme==='light'?lightBg:darkBg;root.style.color=theme==='light'?lightText:darkText;document.cookie=cookieName+'='+theme+'; path=/; max-age=31536000; samesite=lax';}catch(e){}})()`}
        </Script>
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
        style={{ backgroundColor: initialBackground, color: initialText }}
      >
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
