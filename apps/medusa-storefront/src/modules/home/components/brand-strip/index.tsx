import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"

export default async function BrandStrip({
  collections,
}: {
  collections: HttpTypes.StoreCollection[]
}) {
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  // Show collections marked as brand, or fall back to all available
  const brands = collections.filter((c) => {
    const meta = c.metadata as Record<string, unknown> | null
    return meta?.type === "brand" || meta?.is_brand === true
  })

  const display = brands.length >= 2 ? brands : collections

  if (!display.length) return null

  return (
    <section className="content-container py-4">
      <div
        className="overflow-hidden rounded-2xl px-6 py-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col gap-4 small:flex-row small:items-center">
          {/* Label */}
          <p
            className="shrink-0 text-xs font-black uppercase tracking-widest"
            style={{ color: "var(--text-dim)" }}
          >
            {t("brandStripFeaturedBrands")}
          </p>

          {/* Divider */}
          <div
            className="hidden h-4 w-px shrink-0 small:block"
            style={{ background: "var(--border)" }}
            aria-hidden
          />

          {/* Brand list */}
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {display.map((brand) => {
              const meta = brand.metadata as Record<string, unknown> | null
              const logo =
                typeof meta?.brand_logo === "string" ? meta.brand_logo : null

              return (
                <li key={brand.id}>
                  <LocalizedClientLink
                    href={`/collections/${brand.handle}`}
                    className="group flex items-center gap-2 transition-colors duration-150"
                  >
                    {logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logo}
                        alt={brand.title}
                        width={96}
                        height={24}
                        className="h-6 w-auto object-contain opacity-60 transition-opacity duration-150 group-hover:opacity-100"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span
                        className="font-syne text-sm font-bold uppercase tracking-widest opacity-50 transition-all duration-150 group-hover:opacity-100"
                        style={{ color: "var(--text)", "--tw-text-opacity": "1" } as React.CSSProperties}
                      >
                        {brand.title}
                      </span>
                    )}
                  </LocalizedClientLink>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
