"use client"

import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export default function SortBar({
  sortBy,
  count,
}: {
  sortBy: SortOptions
  count?: number
}) {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sortOptions: { label: string; value: SortOptions }[] = [
    { label: t("storeSortNewest"), value: "created_at" },
    { label: t("storeSortPriceLowHigh"), value: "price_asc" },
    { label: t("storeSortPriceHighLow"), value: "price_desc" },
  ]

  const setSort = useCallback(
    (value: SortOptions) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("sortBy", value)
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
      {/* Count */}
      {count !== undefined && (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--teal)" }}>
            {count}
          </span>{" "}
          {count === 1 ? t("storeProductSingular") : t("storeProductPlural")}
        </p>
      )}

      {/* Sort pills */}
      <div
        className="flex items-center gap-1 rounded-full p-1"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        {sortOptions.map((opt) => {
          const active = sortBy === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150"
              style={
                active
                  ? {
                      background: "var(--teal)",
                      color: "#000",
                      fontWeight: 700,
                    }
                  : {
                      background: "transparent",
                      color: "var(--text-dim)",
                    }
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
