"use client"

import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 rounded-2xl px-8 py-24 text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      data-testid="empty-cart-message"
    >
      <span className="text-6xl" aria-hidden>
        🛒
      </span>
      <div>
        <h1
          className="font-syne text-3xl font-bold"
          style={{ color: "var(--text)" }}
        >
          {t("cartEmptyTitle")}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-7" style={{ color: "var(--text-dim)" }}>
          {t("cartEmptyDescription")}
        </p>
      </div>
      <LocalizedClientLink href="/store" className="btn-primary px-8">
        {t("cartEmptyExploreProducts")}
      </LocalizedClientLink>
    </div>
  )
}

export default EmptyCartMessage
