import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <p
        className="text-sm font-semibold mb-2"
        style={{ color: "var(--text)" }}
      >
        Need help?
      </p>
      <ul className="flex flex-col gap-y-1">
        <li>
          <LocalizedClientLink
            href="/contact"
            className="text-sm hover:underline"
            style={{ color: "var(--teal)" }}
          >
            Contact support
          </LocalizedClientLink>
        </li>
        <li>
          <LocalizedClientLink
            href="/contact"
            className="text-sm hover:underline"
            style={{ color: "var(--teal)" }}
          >
            Returns &amp; Exchanges
          </LocalizedClientLink>
        </li>
      </ul>
    </div>
  )
}

export default Help
