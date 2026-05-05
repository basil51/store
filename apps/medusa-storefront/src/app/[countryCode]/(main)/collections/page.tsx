import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { getLocale } from "@lib/data/locale-actions"
import { listLocales } from "@lib/data/locales"
import { getUiCopy } from "@lib/ui-copy"
import {
  buildBreadcrumbStructuredData,
  buildCanonicalUrl,
  buildCollectionPageStructuredData,
  buildItemListStructuredData,
  buildLanguageAlternates,
  buildLocalizedPath,
  getOpenGraphImage,
  serializeStructuredData,
  getTwitterImage,
} from "@lib/util/seo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const params = await props.params
  const [locale, locales] = await Promise.all([getLocale(), listLocales()])
  const title = `${getUiCopy(locale, "navCollections")} | NEXMART`
  const description = getUiCopy(locale, "metaCollectionsDescription")
  const path = buildLocalizedPath(params.countryCode, "collections")
  const canonicalUrl = buildCanonicalUrl(path)

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(path, locales, locale ?? "en"),
    },
    openGraph: {
      type: "website",
      siteName: "NEXMART",
      title,
      description,
      url: canonicalUrl,
      images: [getOpenGraphImage(null, title)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getTwitterImage(null)],
    },
  }
}

export default async function CollectionsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const { collections } = await listCollections({
    fields: "id,handle,title,metadata",
  })
  const canonicalUrl = buildCanonicalUrl(
    buildLocalizedPath(params.countryCode, "collections")
  )
  const collectionEntries = collections
    .filter((collection) => collection.handle)
    .map((collection) => ({
      name: collection.title,
      item: buildCanonicalUrl(
        buildLocalizedPath(params.countryCode, "collections", collection.handle!)
      ),
    }))
  const structuredData = serializeStructuredData([
    buildBreadcrumbStructuredData([
      {
        name: t("navHome"),
        item: buildCanonicalUrl(buildLocalizedPath(params.countryCode)),
      },
      {
        name: t("navCollections"),
        item: canonicalUrl,
      },
    ]),
    buildCollectionPageStructuredData({
      name: t("navCollections"),
      description: t("metaCollectionsDescription"),
      url: canonicalUrl,
    }),
    buildItemListStructuredData({
      name: t("navCollections"),
      url: canonicalUrl,
      items: collectionEntries,
    }),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />
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
    </>
  )
}