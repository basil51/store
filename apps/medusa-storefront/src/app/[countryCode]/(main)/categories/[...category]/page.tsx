import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listLocales } from "@lib/data/locales"
import { listRegions } from "@lib/data/regions"
import { getCategoryImageUrl } from "@lib/util/category-metadata"
import {
  buildBreadcrumbStructuredData,
  buildCanonicalUrl,
  buildCollectionPageStructuredData,
  getCategoryBreadcrumbItems,
  buildLanguageAlternates,
  buildLocalizedPath,
  getOpenGraphImage,
  serializeStructuredData,
  getTwitterImage,
} from "@lib/util/seo"
import { StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

export async function generateStaticParams() {
  const product_categories = await listCategories()

  if (!product_categories) {
    return []
  }

  const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
    regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
  )

  const categoryHandles = product_categories.map(
    (category: any) => category.handle
  )

  const staticParams = countryCodes
    ?.map((countryCode: string | undefined) =>
      categoryHandles.map((handle: any) => ({
        countryCode,
        category: [handle],
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const [productCategory, locales] = await Promise.all([
      getCategoryByHandle(params.category),
      listLocales(),
    ])

    const title = `${productCategory.name} | NEXMART`
    const description =
      productCategory.description ??
      `Shop ${productCategory.name} at NEXMART — tech products with fast shipping and great deals.`
    const path = buildLocalizedPath(params.countryCode, "categories", params.category)
    const canonicalUrl = buildCanonicalUrl(path)
    const image = getCategoryImageUrl(
      productCategory.metadata as Record<string, unknown> | null
    )

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
        images: [getOpenGraphImage(image, productCategory.name)],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [getTwitterImage(image)],
      },
    }
  } catch (error) {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  const categoryPath = buildLocalizedPath(
    params.countryCode,
    "categories",
    params.category
  )
  const canonicalUrl = buildCanonicalUrl(categoryPath)
  const categoryImage = getCategoryImageUrl(
    productCategory.metadata as Record<string, unknown> | null
  )
  const structuredData = serializeStructuredData([
    buildBreadcrumbStructuredData(
      getCategoryBreadcrumbItems(productCategory, params.countryCode)
    ),
    buildCollectionPageStructuredData({
      name: productCategory.name,
      description: productCategory.description,
      url: canonicalUrl,
      image: categoryImage,
    }),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />
      <CategoryTemplate
        category={productCategory}
        sortBy={sortBy}
        page={page}
        countryCode={params.countryCode}
      />
    </>
  )
}
