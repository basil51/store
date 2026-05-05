import { Metadata } from "next"

import { getLocale } from "@lib/data/locale-actions"
import { listLocales } from "@lib/data/locales"
import { getUiCopy } from "@lib/ui-copy"
import { normalizeSearchQuery } from "@lib/util/search"
import {
  buildBreadcrumbStructuredData,
  buildCanonicalUrl,
  buildCollectionPageStructuredData,
  buildLanguageAlternates,
  buildLocalizedPath,
  getOpenGraphImage,
  serializeStructuredData,
  getTwitterImage,
} from "@lib/util/seo"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const params = await props.params
  const searchParams = await props.searchParams
  const [locale, locales] = await Promise.all([getLocale(), listLocales()])
  const query = normalizeSearchQuery(searchParams.q)
  const title = query
    ? `${getUiCopy(locale, "storeSearchResultsTitle", { query })} | NEXMART`
    : "Shop All | NEXMART"
  const description = query
    ? getUiCopy(locale, "storeSearchResultsSubtitle")
    : "Browse the full NEXMART catalogue — phones, laptops, gaming, accessories and more."
  const path = buildLocalizedPath(params.countryCode, "store")
  const canonicalUrl = buildCanonicalUrl(path)

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(path, locales),
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

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
    q?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, q } = searchParams
  const locale = await getLocale()
  const query = normalizeSearchQuery(q)
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const canonicalUrl = buildCanonicalUrl(buildLocalizedPath(params.countryCode, "store"))
  const structuredData = !query
    ? serializeStructuredData([
        buildBreadcrumbStructuredData([
          {
            name: t("navHome"),
            item: buildCanonicalUrl(buildLocalizedPath(params.countryCode)),
          },
          {
            name: t("navShop"),
            item: canonicalUrl,
          },
        ]),
        buildCollectionPageStructuredData({
          name: t("sidebarAllProducts"),
          description: t("storePageSubtitle"),
          url: canonicalUrl,
        }),
      ])
    : null

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      ) : null}
      <StoreTemplate
        sortBy={sortBy}
        page={page}
        query={q}
        countryCode={params.countryCode}
      />
    </>
  )
}
