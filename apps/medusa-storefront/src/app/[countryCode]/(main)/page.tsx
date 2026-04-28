import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import FlashSaleStrip from "@modules/home/components/flash-sale-strip"
import CategoryPills from "@modules/home/components/category-pills"
import PromoBanners from "@modules/home/components/promo-banners"
import BrandStrip from "@modules/home/components/brand-strip"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"

const SITE_NAME = "NEXMART"
const SITE_DESCRIPTION =
  "Your destination for mobiles, laptops, gaming gear, accessories and more — fast shipping, great deals."

export const metadata: Metadata = {
  title: `${SITE_NAME} — Tech Store`,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Tech Store`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Tech Store`,
    description: SITE_DESCRIPTION,
  },
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

  return (
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
  )
}

