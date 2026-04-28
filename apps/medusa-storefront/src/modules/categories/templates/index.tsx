import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import CategorySidebar from "@modules/layout/components/category-sidebar"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import CategoryHeroImage from "@modules/categories/components/category-hero-image"
import { getCategoryImageUrl } from "@lib/util/category-metadata"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <div
      className="content-container flex flex-col gap-8 py-8 small:flex-row small:items-start small:py-10"
      data-testid="category-container"
    >
      <CategorySidebar sortBy={sort} activeCategoryId={category.id} />
      <div className="w-full space-y-8">
        <div
          className="overflow-hidden rounded-2xl px-6 py-7 small:px-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="mb-4 flex flex-row flex-wrap gap-3 text-sm">
            {parents &&
              parents.map((parent) => (
                <span key={parent.id} style={{ color: "var(--text-muted)" }}>
                  <LocalizedClientLink
                    className="transition-colors hover:text-white"
                    style={{ marginInlineEnd: "0.5rem" }}
                    href={`/categories/${parent.handle}`}
                    data-testid="sort-by-link"
                  >
                    {parent.name}
                  </LocalizedClientLink>
                  /
                </span>
              ))}
          </div>
          <p className="tech-kicker">Category</p>
          <h1
            className="mt-3 font-syne text-3xl font-bold tracking-tight small:text-5xl"
            style={{ color: "var(--text)" }}
            data-testid="category-page-title"
          >
            {category.name}
          </h1>
          {category.description && (
            <div className="mt-4 text-base-regular" style={{ color: "var(--text-muted)" }}>
              <p>{category.description}</p>
            </div>
          )}
        </div>

        <CategoryHeroImage name={category.name} metadata={category.metadata} />

        {category.category_children && (
          <div className="text-base-large">
            <div className="mb-4">
              <p className="tech-kicker">Subcategories</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                Narrow the catalog faster
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-4 small:grid-cols-2">
              {category.category_children?.map((c) => {
                const childImg = getCategoryImageUrl(c.metadata)
                return (
                  <li key={c.id}>
                    <LocalizedClientLink
                      href={`/categories/${c.handle}`}
                      className="nx-card flex items-center gap-4 p-4 transition-all duration-200 hover:-translate-y-1"
                      style={{ color: "var(--text)" }}
                    >
                      {childImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={childImg}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                          style={{ background: "var(--surface2)" }}
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="h-16 w-16 shrink-0 rounded-2xl"
                          style={{ background: "var(--surface2)" }}
                          aria-hidden
                        />
                      )}
                      <div>
                        <span className="block font-semibold">{c.name}</span>
                        <span className="mt-1 block text-sm" style={{ color: "var(--text-muted)" }}>
                          Explore products in this section
                        </span>
                      </div>
                    </LocalizedClientLink>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}
