import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"

type BannerTheme = "teal" | "coral"

const THEMES: Record<
  BannerTheme,
  {
    gradient: string
    orbColor: string
    ctaClass: string
    tagColor: string
    defaultEmoji: string
    defaultTag: string
    defaultSubtitle: string
  }
> = {
  teal: {
    gradient:
      "linear-gradient(135deg, var(--surface) 0%, rgba(0,229,200,0.1) 60%, rgba(0,229,200,0.04) 100%)",
    orbColor: "rgba(0,229,200,0.18)",
    ctaClass: "btn-primary",
    tagColor: "var(--teal)",
    defaultEmoji: "💻",
    defaultTag: "⚡ Top Picks",
    defaultSubtitle: "Curated selections for every setup",
  },
  coral: {
    gradient:
      "linear-gradient(135deg, var(--surface) 0%, rgba(255,94,98,0.1) 60%, rgba(255,94,98,0.04) 100%)",
    orbColor: "rgba(255,94,98,0.2)",
    ctaClass: "btn-secondary",
    tagColor: "var(--coral)",
    defaultEmoji: "🎮",
    defaultTag: "🔥 New Arrivals",
    defaultSubtitle: "Fresh drops added every week",
  },
}

function PromoBanner({
  collection,
  theme,
  locale,
}: {
  collection: HttpTypes.StoreCollection
  theme: BannerTheme
  locale: string
}) {
  const t = THEMES[theme]
  const meta = collection.metadata as Record<string, unknown> | null

  const emoji =
    typeof meta?.banner_emoji === "string" ? meta.banner_emoji : t.defaultEmoji
  const tag =
    typeof meta?.banner_tag === "string"
      ? meta.banner_tag
      : theme === "teal"
      ? getUiCopy(locale, "promoTopPicksTag")
      : getUiCopy(locale, "promoNewArrivalsTag")
  const subtitle =
    typeof meta?.banner_subtitle === "string"
      ? meta.banner_subtitle
      : theme === "teal"
      ? getUiCopy(locale, "promoTopPicksSubtitle")
      : getUiCopy(locale, "promoNewArrivalsSubtitle")

  return (
    <LocalizedClientLink
      href={`/collections/${collection.handle}`}
      className="group block"
    >
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-10 transition-transform duration-300 hover:-translate-y-1"
        style={{
          background: t.gradient,
          border: "1px solid var(--border)",
          minHeight: "220px",
        }}
      >
        {/* Background orb */}
        <div
          className="pointer-events-none absolute h-56 w-56 rounded-full blur-3xl"
          style={{
            background: t.orbColor,
            insetInlineEnd: "-3rem",
            top: "-3rem",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute h-40 w-40 rounded-full blur-2xl opacity-50"
          style={{
            background: t.orbColor,
            insetInlineStart: "-2.5rem",
            bottom: "-2.5rem",
          }}
          aria-hidden
        />

        {/* Content */}
        <div className="relative z-10">
          <p
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: t.tagColor }}
          >
            {tag}
          </p>
          <h3
            className="font-syne mt-3 text-2xl font-bold leading-tight small:text-3xl"
            style={{ color: "var(--text)" }}
          >
            {collection.title}
          </h3>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--text-dim)" }}
          >
            {subtitle}
          </p>
          <div className={`${t.ctaClass} mt-6 inline-flex text-sm`}>
            {getUiCopy(locale, "promoShopCollection")}
          </div>
        </div>

        {/* Floating emoji */}
        <span
          className="pointer-events-none absolute bottom-6 select-none text-6xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ insetInlineEnd: "2rem" }}
          aria-hidden
        >
          {emoji}
        </span>
      </div>
    </LocalizedClientLink>
  )
}

export default async function PromoBanners({
  collections,
}: {
  collections: HttpTypes.StoreCollection[]
}) {
  // Need at least 1 collection
  if (!collections.length) return null

  const locale = (await getLocale()) ?? "en"

  const first = collections[0]
  const second = collections[1] ?? collections[0]

  return (
    <section className="content-container py-6">
      <div className="grid gap-4 small:grid-cols-2">
        <PromoBanner collection={first} theme="teal" locale={locale} />
        <PromoBanner collection={second} theme="coral" locale={locale} />
      </div>
    </section>
  )
}
