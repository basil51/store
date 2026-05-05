import { Suspense } from "react"

import { retrieveCustomer } from "@lib/data/customer"
import { getLocale } from "@lib/data/locale-actions"
import { listLocales } from "@lib/data/locales"
import { getUiCopy } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import LanguageQaSwitch from "@modules/layout/components/language-qa-switch"
import ThemeToggle from "@modules/common/components/theme-toggle"
import CurrencySelector from "@modules/common/components/currency-selector"
import Ticker from "@modules/layout/components/ticker"
import CategoryNavBar from "@modules/layout/components/category-nav-bar"
import SearchForm from "@modules/search/components/search-form"

export default async function Nav() {
  const [customer, locales, currentLocale] = await Promise.all([
    retrieveCustomer(),
    listLocales(),
    getLocale(),
  ])

  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(currentLocale, key, params)
  const customerDisplayName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ").trim() ||
    customer?.email?.split("@")[0] ||
    t("navAccount")

  return (
    <div className="sticky top-0 inset-x-0 z-50 isolate">
      {/* ── Ticker ── */}
      <Ticker />

      {/* ── Main header ── */}
      <header
        className="relative z-20 border-b"
        style={{
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px)",
          borderColor: "var(--border)",
        }}
      >
        <nav className="content-container relative z-10 flex h-[68px] items-center justify-between gap-3 overflow-visible">

          {/* Left: Logo */}
          <LocalizedClientLink
            href="/"
            className="flex items-center shrink-0"
            data-testid="nav-store-link"
          >
            <span
              className="font-syne text-xl font-extrabold tracking-widest leading-none"
              style={{ letterSpacing: "3px" }}
            >
              <span style={{ color: "var(--text)" }}>NEX</span>
              <span style={{ color: "var(--teal)" }}>MART</span>
              <span
                className="inline-block w-2 h-2 rounded-full align-middle"
                style={{
                  background: "var(--coral)",
                  animation: "logoPulse 2s ease-in-out infinite",
                  marginBottom: "2px",
                  marginInlineStart: "0.125rem",
                }}
              />
            </span>
          </LocalizedClientLink>

          {/* Center: Search */}
          <SearchForm
            placeholder={t("navSearchPlaceholder")}
            suggestionsLabel={t("navSearchSuggestionsLabel")}
            recoveredSuggestionsLabelTemplate={t("navSearchRecoveredSuggestionsLabel", {
              query: "{query}",
            })}
            noSuggestionsLabel={t("navSearchNoSuggestions")}
            viewAllResultsLabelTemplate={t("navSearchViewAllResults", {
              query: "{query}",
            })}
            viewRecoveredResultsLabelTemplate={t("navSearchViewRecoveredResults", {
              query: "{query}",
            })}
            locale={currentLocale}
          />

          {/* Right: Shop · Collections · User chip · Theme · Cart */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden small:flex items-center gap-0.5">
              <LocalizedClientLink
                href="/store"
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-white"
                style={{ color: "var(--text-muted)" }}
              >
                {t("navShop")}
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/collections"
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-white"
                style={{ color: "var(--text-muted)" }}
              >
                {t("navCollections")}
              </LocalizedClientLink>
            </div>

            {/* User chip */}
            <LocalizedClientLink
              href="/account"
              data-testid="nav-account-link"
              className="hidden small:inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-px hover:border-[var(--teal)] hover:text-[var(--teal)]"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              {/* User icon */}
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                style={{ color: "var(--teal)" }}
              >
                <circle cx="12" cy="8" r="4" />
                <path strokeLinecap="round" d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
              </svg>
              <span className="max-w-[96px] truncate md:max-w-[140px]">
                {customerDisplayName}
              </span>
            </LocalizedClientLink>

            <LanguageQaSwitch
              locales={locales}
              currentLocale={currentLocale}
            />

            <CurrencySelector />

            <ThemeToggle />

            <div
              className="rounded-full border px-3 py-1.5 text-sm font-medium"
              style={{
                background: "linear-gradient(135deg, var(--coral), var(--coral-dim))",
                borderColor: "transparent",
                color: "#ffffff",
              }}
            >
              <Suspense
                fallback={
                  <LocalizedClientLink
                    className="flex gap-2"
                    href="/cart"
                    data-testid="nav-cart-link"
                  >
                    🛒 {t("navCart")}
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>
            </div>
          </div>

        </nav>
      </header>

      {/* ── Category nav bar (from DB) ── */}
      <CategoryNavBar />
    </div>
  )
}

