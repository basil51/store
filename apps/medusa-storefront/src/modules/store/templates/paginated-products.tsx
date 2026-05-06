import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getStorefrontSettings } from "@lib/data/currency"
import { getSearchRecovery } from "@lib/data/search-recovery"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import SearchResultsAnalytics from "@modules/search/components/search-results-analytics"
import SortBar from "@modules/store/components/sort-bar"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getLocale } from "@lib/data/locale-actions"
import {
  getDistinctRecoveredSearchQuery,
  rankSearchProductsByQuery,
} from "@lib/util/search"
import { getUiCopy } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  q?: string
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  query,
  countryCode,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  query?: string
  countryCode: string
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (query) {
    queryParams["q"] = query
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)
  const storeSettings = await getStorefrontSettings()
  const locale = await getLocale()
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  if (!region) {
    return null
  }

  let {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
  })

  const originalResultCount = count
  let recoveredQuery: string | undefined
  let recoverySource: "override" | "analytics" | undefined

  if (query && count === 0) {
    const recovery = await getSearchRecovery({
      query,
      locale,
      countryCode,
    })

    const distinctRecoveredQuery = getDistinctRecoveredSearchQuery({
      query,
      recoveryQuery: recovery?.query,
      recoveryNormalizedQuery: recovery?.normalized_query,
    })

    if (distinctRecoveredQuery) {
      const recoveredResponse = await listProductsWithSort({
        page,
        queryParams: {
          ...queryParams,
          q: distinctRecoveredQuery,
        },
        sortBy,
        countryCode,
      })

      products = recoveredResponse.response.products
      count = recoveredResponse.response.count
      recoveredQuery = distinctRecoveredQuery
      recoverySource = recovery.source
    }
  }

  if (query && (!sortBy || sortBy === "created_at")) {
    products = rankSearchProductsByQuery(products, query)
  }

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  return (
    <>
      <SearchResultsAnalytics
        query={query}
        resultCount={count}
        locale={locale}
        countryCode={countryCode}
        recoveredQuery={recoveredQuery}
        recoverySource={recoverySource}
        originalResultCount={originalResultCount}
      />
      {query && recoveredQuery && originalResultCount === 0 && (
        <div
          className="mb-5 rounded-2xl border px-5 py-4"
          style={{
            background: "color-mix(in srgb, var(--teal) 8%, var(--surface))",
            borderColor: "color-mix(in srgb, var(--teal) 22%, var(--border))",
          }}
        >
          <p className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: "var(--teal)" }}>
            {t("storeSearchRecoveryTitle", { query })}
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            {t("storeSearchRecoverySubtitle", { recovered_query: recoveredQuery })}
          </p>
          <LocalizedClientLink
            href={`/store?q=${encodeURIComponent(recoveredQuery)}`}
            className="mt-4 inline-flex rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors hover:border-[var(--teal)]"
            style={{ borderColor: "var(--border)", color: "var(--teal)" }}
          >
            {t("storeSearchRecoveryCta", { recovered_query: recoveredQuery })}
          </LocalizedClientLink>
        </div>
      )}
      {query && !count && !recoveredQuery && (
        <div
          className="mb-5 rounded-2xl border px-5 py-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {t("storeSearchEmptyTitle", { query })}
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            {t("storeSearchEmptySubtitle")}
          </p>
        </div>
      )}
      <SortBar sortBy={sortBy ?? "created_at"} count={count} />
      <ul
        className="grid w-full grid-cols-1 gap-5 xsmall:grid-cols-2 medium:grid-cols-3 large:grid-cols-4"
        data-testid="products-list"
      >
        {products.map((p, index) => {
          return (
            <li key={p.id}>
              <ProductPreview
                product={p}
                region={region}
                defaultStockMode={storeSettings.defaultStockMode}
                imageLoading={index < 4 ? "eager" : "lazy"}
              />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center">
          <Pagination
            data-testid="product-pagination"
            page={page}
            totalPages={totalPages}
          />
        </div>
      )}
    </>
  )
}
