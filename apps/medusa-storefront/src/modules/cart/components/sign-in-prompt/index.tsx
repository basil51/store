"use client"

import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  return (
    <div
      className="flex items-center justify-between rounded-xl px-5 py-4"
      style={{
        background: "rgba(0,229,200,0.06)",
        border: "1px solid rgba(0,229,200,0.2)",
      }}
    >
      <div>
        <p className="font-semibold" style={{ color: "var(--text)" }}>
          {t("cartSignInTitle")}
        </p>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-dim)" }}>
          {t("cartSignInDescription")}
        </p>
      </div>
      <LocalizedClientLink href="/account">
        <button
          className="btn-ghost text-sm"
          data-testid="sign-in-button"
        >
          {t("cartSignInCta")}
        </button>
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
