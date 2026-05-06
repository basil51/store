"use client"

import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) =>
    getAccountCopy(locale, key)

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <p
        className="text-sm font-semibold mb-2"
        style={{ color: "var(--text)" }}
      >
        {t("needHelp")}
      </p>
      <ul className="flex flex-col gap-y-1">
        <li>
          <LocalizedClientLink
            href="/contact#support"
            className="text-sm hover:underline"
            style={{ color: "var(--teal)" }}
          >
            {t("contactSupport")}
          </LocalizedClientLink>
        </li>
        <li>
          <LocalizedClientLink
            href="/contact#returns"
            className="text-sm hover:underline"
            style={{ color: "var(--teal)" }}
          >
            {t("returnsExchanges")}
          </LocalizedClientLink>
        </li>
      </ul>
    </div>
  )
}

export default Help
