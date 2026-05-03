import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import CategorySidebar from "@modules/layout/components/category-sidebar"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const locale = (await getLocale()) ?? "en"
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

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
            {t("sidebarAllProducts")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            {t("storePageSubtitle")}
          </p>
        </div>

        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
