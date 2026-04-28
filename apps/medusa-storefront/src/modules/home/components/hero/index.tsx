import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type HeroProps = {
  collections: HttpTypes.StoreCollection[]
  productCount?: number
  collectionCount?: number
  categoryCount?: number
}

const Hero = async ({
  collections,
  productCount = 0,
  collectionCount = 0,
  categoryCount = 0,
}: HeroProps) => {
  const locale = (await getLocale()) ?? "en"
  const t = (
    key: Parameters<typeof getUiCopy>[1],
    params?: Record<string, string | number>
  ) => getUiCopy(locale, key, params)

  const primaryCollection = collections[0]
  const secondaryCollections = collections.slice(1, 3)
  const stats = [
    {
      value: productCount ? `${productCount}+` : "100+",
      label: t("heroStatsProducts"),
    },
    {
      value: collectionCount ? `${collectionCount}` : "10+",
      label: t("heroStatsCollections"),
    },
    {
      value: categoryCount ? `${categoryCount}` : "8",
      label: t("heroStatsCategories"),
    },
    { value: "2yr", label: t("heroStatsWarranty") },
  ]

  return (
    <section className="content-container pt-6 pb-2">
      <div
        className="relative overflow-hidden px-8 py-14 small:px-14 small:py-20"
        style={{
          borderRadius: "20px",
          background:
            "linear-gradient(135deg, #090d1a 0%, #0f1628 50%, #091620 100%)",
          border: "1px solid rgba(0,229,200,0.12)",
        }}
      >
        {/* Orb - teal (top-right) */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 380,
            height: 380,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,229,200,0.18), transparent 70%)",
            top: -100,
            right: -80,
            filter: "blur(70px)",
            animation: "orbFloat 7s ease-in-out infinite",
          }}
        />

        {/* Orb - coral (bottom-center) */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 260,
            height: 260,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,94,98,0.16), transparent 70%)",
            bottom: -80,
            right: "30%",
            filter: "blur(60px)",
            animation: "orbFloat 9s ease-in-out infinite reverse",
          }}
        />

        {/* Orb - amber (bottom-left) */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,203,71,0.12), transparent 70%)",
            bottom: -40,
            left: "5%",
            filter: "blur(50px)",
            animation: "orbFloat 11s ease-in-out infinite 2s",
          }}
        />

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,229,200,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,200,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative grid gap-12 large:grid-cols-[1fr_360px] large:items-center">
          <div className="z-10 max-w-2xl space-y-7">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest"
              style={{
                background: "rgba(0,229,200,0.1)",
                border: "1px solid rgba(0,229,200,0.25)",
                color: "var(--teal)",
              }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: "var(--teal)",
                  animation: "logoPulse 1.5s infinite",
                }}
              />
              {t("heroCatalogBadge")}
            </div>

            <h1
              className="font-syne font-extrabold leading-[0.95]"
              style={{
                fontSize: "clamp(2.6rem, 5vw, 5.8rem)",
                letterSpacing: "-0.03em",
                color: "#f0f2f8",
              }}
            >
              <span style={{ color: "var(--teal)" }}>
                {t("heroHeadlineShopSmarter")}
              </span>
              <br />
              <span style={{ color: "var(--coral)" }}>
                {t("heroHeadlineSaveMore")}
              </span>
            </h1>

            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "15px",
                lineHeight: "1.75",
                maxWidth: 440,
              }}
            >
              {t("heroDescription")}
            </p>

            <div className="flex flex-wrap gap-3">
              <LocalizedClientLink href="/store" className="btn-primary">
                {t("heroExploreDeals")}
              </LocalizedClientLink>

              {primaryCollection ? (
                <LocalizedClientLink
                  href={`/collections/${primaryCollection.handle}`}
                  className="btn-secondary"
                >
                  {primaryCollection.title} ⚡
                </LocalizedClientLink>
              ) : (
                <LocalizedClientLink href="/store" className="btn-secondary">
                  {t("heroBrowseCatalog")}
                </LocalizedClientLink>
              )}
            </div>

            <div
              className="flex flex-wrap gap-6 border-t pt-2"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span
                    className="font-syne text-2xl font-bold"
                    style={{ color: "var(--teal)" }}
                  >
                    {s.value}
                  </span>
                  <span
                    className="text-xs font-medium uppercase tracking-widest"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="z-10 space-y-3">
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(0,229,200,0.06)",
                border: "1px solid rgba(0,229,200,0.15)",
              }}
            >
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--teal)" }}
              >
                ✦ {t("heroWhatsInside")}
              </span>
              <h2
                className="font-syne mt-2 text-lg font-bold"
                style={{ color: "#f0f2f8" }}
              >
                {t("heroPresentedClearly")}
              </h2>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                {t("heroCompareSpecs")}
              </p>
            </div>

            {secondaryCollections.length > 0
              ? secondaryCollections.map((col) => (
                  <LocalizedClientLink
                    key={col.id}
                    href={`/collections/${col.handle}`}
                    className="group flex items-center justify-between rounded-2xl p-5 transition-all hover:-translate-y-px"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <p
                        className="text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {t("heroCollectionLabel")}
                      </p>
                      <p className="mt-1 font-semibold" style={{ color: "#f0f2f8" }}>
                        {col.title}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        background: "rgba(0,229,200,0.12)",
                        color: "var(--teal)",
                      }}
                    >
                      {t("heroView")}
                    </span>
                  </LocalizedClientLink>
                ))
              : [0, 1].map((i) => (
                  <LocalizedClientLink
                    key={i}
                    href="/store"
                    className="group flex items-center justify-between rounded-2xl p-5 transition-all hover:-translate-y-px"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <p
                        className="text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {t("heroCatalogLabel")}
                      </p>
                      <p className="mt-1 font-semibold" style={{ color: "#f0f2f8" }}>
                        {t("heroBrowseAllProducts")}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        background: "rgba(0,229,200,0.12)",
                        color: "var(--teal)",
                      }}
                    >
                      {t("heroView")}
                    </span>
                  </LocalizedClientLink>
                ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
