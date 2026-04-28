import { listCategories } from "@lib/data/categories"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function CategoryNavBar() {
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const categories = await listCategories({ limit: 20 })
  const topLevel = categories.filter((c) => !c.parent_category)

  if (!topLevel.length) return null

  return (
    <div
      className="border-b overflow-x-auto no-scrollbar"
      style={{
        background: "var(--nav-bg)",
        borderColor: "var(--border)",
      }}
    >
      <nav className="content-container flex items-center gap-1 h-11 min-w-max">
        {/* Flash Deals pill */}
        <LocalizedClientLink
          href="/store?sort=created_at"
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 hover:-translate-y-px"
          style={{
            background: "linear-gradient(135deg, var(--coral), var(--coral-dim))",
            color: "#fff",
          }}
        >
          ⚡ {t("categoryNavFlashDeals")}
          <span
            className="rounded-full px-1.5 py-0 text-[9px] font-black"
            style={{ background: "rgba(0,0,0,0.25)" }}
          >
            {t("categoryNavHot")}
          </span>
        </LocalizedClientLink>

        <div
          className="w-px h-4 mx-1 shrink-0"
          style={{ background: "var(--border)" }}
        />

        {/* Category links */}
        {topLevel.map((cat) => (
          <LocalizedClientLink
            key={cat.id}
            href={`/categories/${cat.handle}`}
            className="group relative flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition-all shrink-0 hover:text-white"
            style={{ color: "var(--text-muted)" }}
          >
            {cat.name}
            {/* teal underline on hover */}
            <span
              className="absolute bottom-0 h-px scale-x-0 transition-transform group-hover:scale-x-100"
              style={{
                background: "var(--teal)",
                insetInlineStart: "0.75rem",
                insetInlineEnd: "0.75rem",
              }}
            />
          </LocalizedClientLink>
        ))}

        <div
          className="w-px h-4 mx-1 shrink-0"
          style={{ background: "var(--border)" }}
        />

        {/* All products */}
        <LocalizedClientLink
          href="/store"
          className="rounded-lg px-3 py-1 text-xs font-medium transition-colors hover:text-white shrink-0"
          style={{ color: "var(--text-dim)" }}
        >
          {t("categoryNavAll")}
        </LocalizedClientLink>
      </nav>
    </div>
  )
}
