import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import FlashSaleStrip from "@modules/home/components/flash-sale-strip"
import CategoryPills from "@modules/home/components/category-pills"
import PromoBanners from "@modules/home/components/promo-banners"
import BrandStrip from "@modules/home/components/brand-strip"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"
import { getLocale } from "@lib/data/locale-actions"
import { listLocales } from "@lib/data/locales"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getUiCopy } from "@lib/ui-copy"
import {
  buildOrganizationStructuredData,
  buildCanonicalUrl,
  buildLanguageAlternates,
  buildLocalizedPath,
  buildWebsiteStructuredData,
  getOpenGraphImage,
  serializeStructuredData,
  getTwitterImage,
} from "@lib/util/seo"

const SITE_NAME = "NEXMART"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const params = await props.params
  const [locale, locales] = await Promise.all([getLocale(), listLocales()])
  const title = `${SITE_NAME} - ${getUiCopy(locale, "metaHomeTitleSuffix")}`
  const description = getUiCopy(locale, "metaHomeDescription")
  const path = buildLocalizedPath(params.countryCode)
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
      siteName: SITE_NAME,
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

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params

  const region = await getRegion(countryCode)

  const [{ collections }, categories, productsData] = await Promise.all([
    listCollections({ fields: "id, handle, title, metadata" }),
    listCategories({ limit: 20 }),
    region
      ? listProducts({
          regionId: region.id,
          queryParams: { limit: 1 },
        })
      : Promise.resolve({ response: { count: 0, products: [] }, nextPage: null }),
  ])

  if (!collections || !region) {
    return null
  }

  const productCount = productsData.response.count
  const collectionCount = collections.length
  const categoryCount = categories.filter((c) => !c.parent_category_id).length
  const path = buildLocalizedPath(countryCode)
  const canonicalUrl = buildCanonicalUrl(path)
  const structuredData = serializeStructuredData([
    buildWebsiteStructuredData({
      name: SITE_NAME,
      url: canonicalUrl,
      description: getUiCopy(await getLocale(), "metaHomeDescription"),
    }),
    buildOrganizationStructuredData({
      name: SITE_NAME,
      url: canonicalUrl,
      description: getUiCopy(await getLocale(), "metaHomeDescription"),
    }),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />
      <div className="pb-20 small:pb-24">
        <Hero
          collections={collections.slice(0, 3)}
          productCount={productCount}
          collectionCount={collectionCount}
          categoryCount={categoryCount}
        />

        <FlashSaleStrip />

        <CategoryPills />

        <PromoBanners collections={collections.slice(1, 3)} />

        <BrandStrip collections={collections} />

        <div className="pb-8">
          <ul className="flex flex-col gap-x-6">
            <FeaturedProducts collections={collections.slice(0, 4)} region={region} />
          </ul>
        </div>
      </div>
    </>
  )
}

