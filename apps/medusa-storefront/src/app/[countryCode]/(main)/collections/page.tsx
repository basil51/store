import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Collections | NEXMART",
  description:
    "Browse NEXMART collections to jump into curated brands, categories, and featured product drops.",
  openGraph: {
    type: "website",
    siteName: "NEXMART",
    title: "Collections | NEXMART",
    description:
      "Browse NEXMART collections to jump into curated brands, categories, and featured product drops.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collections | NEXMART",
    description:
      "Browse NEXMART collections to jump into curated brands, categories, and featured product drops.",
  },
}

export default async function CollectionsPage() {
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const { collections } = await listCollections({
    fields: "id,handle,title,metadata",
  })

  return (
    <div className="content-container py-10 small:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <p
          className="text-xs font-black uppercase tracking-[0.35em]"
          style={{ color: "var(--teal)" }}
        >
          {t("navCollections")}
        </p>
        <h1
          className="mt-4 font-syne text-4xl font-extrabold uppercase tracking-[0.08em] small:text-5xl"
          style={{ color: "var(--text)" }}
        >
          {t("navCollections")}
        </h1>
        <p
          className="mx-auto mt-4 max-w-2xl text-sm leading-6 small:text-base"
          style={{ color: "var(--text-muted)" }}
        >
          {t("collectionsPageSubtitle")}
        </p>
      </div>

      {collections.length > 0 ? (
        <div className="mt-10 grid gap-4 small:mt-12 small:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => {
            const meta = collection.metadata as Record<string, unknown> | null
            const eyebrow =
              typeof meta?.type === "string"
                ? meta.type.replace(/[_-]+/g, " ")
                : t("navCollections")
            const summary =
              typeof meta?.description === "string"
                ? meta.description
                : typeof meta?.summary === "string"
                  ? meta.summary
                  : t("collectionsPageCardFallbackSummary", {
                      title: collection.title,
                    })

            return (
              <LocalizedClientLink
                key={collection.id}
                href={`/collections/${collection.handle}`}
                className="group rounded-[28px] border p-6 transition-transform duration-200 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(180deg, var(--surface) 0%, var(--surface2) 100%)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex h-full flex-col">
                  <p
                    className="text-[11px] font-black uppercase tracking-[0.28em]"
                    style={{ color: "var(--coral)" }}
                  >
                    {eyebrow}
                  </p>
                  <h2
                    className="mt-4 font-syne text-2xl font-extrabold uppercase tracking-[0.06em]"
                    style={{ color: "var(--text)" }}
                  >
                    {collection.title}
                  </h2>
                  <p
                    className="mt-3 flex-1 text-sm leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {summary}
                  </p>
                  <span
                    className="mt-6 inline-flex items-center text-sm font-semibold uppercase tracking-[0.18em] transition-colors"
                    style={{ color: "var(--teal)" }}
                  >
                      {t("collectionsPageViewCollection")}
                  </span>
                </div>
              </LocalizedClientLink>
            )
          })}
        </div>
      ) : (
        <div
          className="mx-auto mt-10 max-w-xl rounded-[28px] border px-6 py-10 text-center"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {t("collectionsPageEmpty")}
        </div>
      )}
    </div>
  )
}