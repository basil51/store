import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const getPriceRanges = (
  t: (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) => string
) => [
  { label: t("sidebarPriceUnder50"), query: "price_max=50" },
  { label: t("sidebarPrice50To100"), query: "price_min=50&price_max=100" },
  { label: t("sidebarPrice100To250"), query: "price_min=100&price_max=250" },
  { label: t("sidebarPriceOver250"), query: "price_min=250" },
]

function SidebarSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2"
        style={{
          borderInlineStart: "2px solid var(--teal)",
          paddingInlineStart: "0.75rem",
        }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-dim)" }}
        >
          {title}
        </span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function SidebarLink({
  href,
  children,
  active,
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <LocalizedClientLink
      href={href}
      className="group flex items-center rounded-lg px-3 py-1.5 text-sm transition-all duration-150 hover:[padding-inline-start:1.25rem]"
      style={{
        color: active ? "var(--teal)" : "var(--text-muted)",
        background: active ? "rgba(0,229,200,0.06)" : "transparent",
        fontWeight: active ? 600 : 400,
      }}
    >
      {active && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: "var(--teal)", marginInlineEnd: "0.5rem" }}
        />
      )}
      {children}
    </LocalizedClientLink>
  )
}

export default async function CategorySidebar({
  sortBy,
  activeCategoryId,
}: {
  sortBy: SortOptions
  activeCategoryId?: string
}) {
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const [categories, { collections }] = await Promise.all([
    listCategories({ limit: 30 }),
    listCollections(),
  ])

  const topLevel = categories.filter((c) => !c.parent_category)
  const PRICE_RANGES = getPriceRanges(t)

  return (
    <aside className="hidden small:block shrink-0 w-[220px] space-y-6">
      {/* Categories */}
      {topLevel.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <SidebarSection title={t("sidebarCategories")}>
            <SidebarLink href="/store">{t("sidebarAllProducts")}</SidebarLink>
            {topLevel.map((cat) => (
              <div key={cat.id}>
                <SidebarLink
                  href={`/categories/${cat.handle}`}
                  active={cat.id === activeCategoryId}
                >
                  {cat.name}
                </SidebarLink>
                {/* children shown when active */}
                {cat.id === activeCategoryId &&
                  cat.category_children?.map((child) => (
                    <LocalizedClientLink
                      key={child.id}
                      href={`/categories/${child.handle}`}
                      className="flex items-center rounded-lg py-1 px-3 text-xs transition-colors hover:text-white"
                      style={{ color: "var(--text-dim)", paddingInlineStart: "1.75rem" }}
                    >
                      ↳ {child.name}
                    </LocalizedClientLink>
                  ))}
              </div>
            ))}
          </SidebarSection>
        </div>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <SidebarSection title={t("sidebarCollections")}>
            {collections.slice(0, 8).map((col) => (
              <SidebarLink key={col.id} href={`/collections/${col.handle}`}>
                {col.title}
              </SidebarLink>
            ))}
          </SidebarSection>
        </div>
      )}

      {/* Price range */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <SidebarSection title={t("sidebarPriceRange")}>
          {PRICE_RANGES.map((r) => (
            <SidebarLink key={r.label} href={`/store?${r.query}`}>
              {r.label}
            </SidebarLink>
          ))}
        </SidebarSection>
      </div>
    </aside>
  )
}
