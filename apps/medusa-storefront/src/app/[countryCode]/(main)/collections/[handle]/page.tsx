import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listLocales } from "@lib/data/locales"
import { listRegions } from "@lib/data/regions"
import {
  buildBreadcrumbStructuredData,
  buildCanonicalUrl,
  buildCollectionPageStructuredData,
  buildLanguageAlternates,
  buildLocalizedPath,
  getOpenGraphImage,
  getSeoMetadataImage,
  serializeStructuredData,
  getTwitterImage,
} from "@lib/util/seo"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<{
    page?: string
    sortBy?: SortOptions
  }>
}

export const PRODUCT_LIMIT = 12

export async function generateStaticParams() {
  const { collections } = await listCollections({
    fields: "handle",
  })

  if (!collections) {
    return []
  }

  const countryCodes = await listRegions().then(
    (regions: StoreRegion[]) =>
      regions
        ?.map((r) => r.countries?.map((c) => c.iso_2))
        .flat()
        .filter(Boolean) as string[]
  )

  const collectionHandles = collections.map(
    (collection: StoreCollection) => collection.handle
  )

  const staticParams = countryCodes
    ?.map((countryCode: string) =>
      collectionHandles.map((handle: string | undefined) => ({
        countryCode,
        handle,
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const [collection, locales] = await Promise.all([
    getCollectionByHandle(params.handle),
    listLocales(),
  ])

  if (!collection) {
    notFound()
  }

  const title = `${collection.title} | NEXMART`
  const description = `Explore the ${collection.title} collection at NEXMART — curated tech products with fast shipping.`
  const path = buildLocalizedPath(params.countryCode, "collections", params.handle)
  const canonicalUrl = buildCanonicalUrl(path)
  const image = getSeoMetadataImage(
    collection.metadata as Record<string, unknown> | null
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
      images: [getOpenGraphImage(image, collection.title)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getTwitterImage(image)],
    },
  } as Metadata
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const collection = await getCollectionByHandle(params.handle).then(
    (collection: StoreCollection) => collection
  )

  if (!collection) {
    notFound()
  }

  const collectionPath = buildLocalizedPath(
    params.countryCode,
    "collections",
    params.handle
  )
  const canonicalUrl = buildCanonicalUrl(collectionPath)
  const collectionImage = getSeoMetadataImage(
    collection.metadata as Record<string, unknown> | null
  )
  const structuredData = serializeStructuredData([
    buildBreadcrumbStructuredData([
      {
        name: "Home",
        item: buildCanonicalUrl(buildLocalizedPath(params.countryCode)),
      },
      {
        name: "Collections",
        item: buildCanonicalUrl(buildLocalizedPath(params.countryCode, "collections")),
      },
      {
        name: collection.title,
        item: canonicalUrl,
      },
    ]),
    buildCollectionPageStructuredData({
      name: collection.title,
      description: `Explore the ${collection.title} collection at NEXMART — curated tech products with fast shipping.`,
      url: canonicalUrl,
      image: collectionImage,
    }),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />
      <CollectionTemplate
        collection={collection}
        page={page}
        sortBy={sortBy}
        countryCode={params.countryCode}
      />
    </>
  )
}
