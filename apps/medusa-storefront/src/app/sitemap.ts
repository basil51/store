import { MetadataRoute } from "next"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"
import {
  buildCanonicalUrl,
  buildLocalizedPath,
  getCategoryPathSegments,
  getSitemapCountryCodes,
} from "@lib/util/seo"

export const revalidate = 3600

type SitemapEntry = MetadataRoute.Sitemap[number]

const createEntry = (
  path: string,
  options: Omit<SitemapEntry, "url"> = {}
): SitemapEntry => ({
  url: buildCanonicalUrl(path),
  ...options,
})

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const regions = await listRegions()
  const countryCodes = getSitemapCountryCodes(regions)

  if (!countryCodes.length) {
    return []
  }

  const entries: MetadataRoute.Sitemap = countryCodes.flatMap((countryCode) => [
    createEntry(buildLocalizedPath(countryCode), {
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    }),
    createEntry(buildLocalizedPath(countryCode, "store"), {
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    }),
    createEntry(buildLocalizedPath(countryCode, "collections"), {
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  ])

  const [categories, { collections }] = await Promise.all([
    listCategories({
      fields: "id,handle,parent_category_id,*parent_category,*parent_category.parent_category",
      limit: 100,
    }),
    listCollections({
      fields: "id,handle,updated_at",
      limit: "100",
    }),
  ])

  countryCodes.forEach((countryCode) => {
    categories.forEach((category) => {
      const segments = getCategoryPathSegments(category)

      if (segments.length) {
        entries.push(
          createEntry(buildLocalizedPath(countryCode, "categories", segments), {
            lastModified,
            changeFrequency: "weekly",
            priority: 0.75,
          })
        )
      }
    })

    collections.forEach((collection) => {
      if (collection.handle) {
        entries.push(
          createEntry(
            buildLocalizedPath(countryCode, "collections", collection.handle),
            {
              lastModified: collection.updated_at
                ? new Date(collection.updated_at)
                : lastModified,
              changeFrequency: "weekly",
              priority: 0.7,
            }
          )
        )
      }
    })
  })

  const productEntries = await Promise.all(
    countryCodes.map(async (countryCode) => {
      const { response } = await listProducts({
        countryCode,
        queryParams: {
          limit: 100,
          fields: "handle,updated_at",
        },
      })

      return response.products
        .filter((product) => product.handle)
        .map((product) =>
          createEntry(buildLocalizedPath(countryCode, "products", product.handle), {
            lastModified: product.updated_at
              ? new Date(product.updated_at)
              : lastModified,
            changeFrequency: "weekly",
            priority: 0.8,
          })
        )
    })
  )

  return [...entries, ...productEntries.flat()]
}
