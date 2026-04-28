import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import { Text, clx } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="w-full mt-16" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
      <div className="content-container py-14 small:py-20">

        {/* Top: brand + nav columns */}
        <div
          className="grid gap-12 pb-12 small:grid-cols-[1fr_auto] small:items-start small:gap-20"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Brand */}
          <div className="max-w-xs space-y-4">
            <p
              className="font-syne text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--teal)" }}
            >
              NEX<span style={{ color: "var(--text-muted)" }}>MART</span>
            </p>
            <p className="text-2xl font-bold leading-snug" style={{ color: "var(--text)" }}>
              {t("footerHeadline")}
            </p>
            <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              {t("footerDescription")}
            </p>
            <div className="flex gap-3 pt-2">
              <LocalizedClientLink href="/store" className="btn-primary text-xs">
                {t("footerBrowseCatalog")}
              </LocalizedClientLink>
              <LocalizedClientLink href="/account" className="btn-ghost text-xs">
                {t("footerMyAccount")}
              </LocalizedClientLink>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 text-sm small:grid-cols-3">
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-3">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("footerCategories")}
                </span>
                <ul className="grid grid-cols-1 gap-2" data-testid="footer-categories">
                  {productCategories?.slice(0, 6).map((c) => {
                    if (c.parent_category) return null
                    const children =
                      c.category_children?.map((child) => ({
                        name: child.name,
                        handle: child.handle,
                        id: child.id,
                      })) || null
                    return (
                      <li className="flex flex-col gap-2" key={c.id} style={{ color: "var(--text-muted)" }}>
                        <LocalizedClientLink
                          className={clx(
                            "transition-colors hover:text-white",
                            children && "font-medium"
                          )}
                          style={{ color: children ? "var(--text)" : "var(--text-muted)" }}
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                        {children && (
                          <ul className="grid gap-2" style={{ marginInlineStart: "0.75rem" }}>
                            {children.map((child) => (
                              <li key={child.id}>
                                <LocalizedClientLink
                                  className="transition-colors hover:text-white"
                                  style={{ color: "var(--text-muted)" }}
                                  href={`/categories/${child.handle}`}
                                  data-testid="category-link"
                                >
                                  {child.name}
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-3">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("footerCollections")}
                </span>
                <ul
                  className={clx("grid grid-cols-1 gap-2", {
                    "grid-cols-2": (collections?.length || 0) > 3,
                  })}
                  style={{ color: "var(--text-muted)" }}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="transition-colors hover:text-white"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-y-3">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                {t("footerStore")}
              </span>
              <ul className="grid gap-2" style={{ color: "var(--text-muted)" }}>
                <li>
                  <LocalizedClientLink
                    href="/store"
                    className="transition-colors hover:text-white"
                  >
                    {t("footerAllProducts")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account"
                    className="transition-colors hover:text-white"
                  >
                    {t("footerAccount")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/cart"
                    className="transition-colors hover:text-white"
                  >
                    {t("footerCart")}
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col gap-3 pt-8 text-xs small:flex-row small:items-center small:justify-between"
          style={{ color: "var(--text-dim)" }}
        >
          <Text className="txt-compact-small">
            {t("footerRightsReserved", { year: new Date().getFullYear() })}
          </Text>
          <Text className="txt-compact-small">
            {t("footerBuiltWith")}
          </Text>
        </div>
      </div>
    </footer>
  )
}
