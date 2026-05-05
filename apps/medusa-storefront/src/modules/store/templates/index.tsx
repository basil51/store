import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import CategorySidebar from "@modules/layout/components/category-sidebar"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { normalizeSearchQuery } from "@lib/util/search"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  query,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  query?: string
  countryCode: string
}) => {
  const locale = (await getLocale()) ?? "en"
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const searchQuery = normalizeSearchQuery(query)

  return (
    <div
      className="content-container flex flex-col gap-8 py-8 small:flex-row small:items-start small:py-10"
      data-testid="category-container"
    >
      <CategorySidebar sortBy={sort} />
      <div className="w-full space-y-8">
        <div
          className="overflow-hidden rounded-2xl px-6 py-8 small:px-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="tech-kicker">{t("heroCatalogLabel")}</p>
          <h1
            className="mt-2 font-syne text-3xl font-bold tracking-tight small:text-5xl"
            style={{ color: "var(--text)" }}
            data-testid="store-page-title"
          >
            {searchQuery
              ? t("storeSearchResultsTitle", { query: searchQuery })
              : t("sidebarAllProducts")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            {searchQuery ? t("storeSearchResultsSubtitle") : t("storePageSubtitle")}
          </p>
          {searchQuery && (
            <LocalizedClientLink
              href="/store"
              className="mt-5 inline-flex rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors hover:border-[var(--teal)]"
              style={{ borderColor: "var(--border)", color: "var(--teal)" }}
            >
              {t("storeSearchClear")}
            </LocalizedClientLink>
          )}
        </div>

        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            query={searchQuery}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
