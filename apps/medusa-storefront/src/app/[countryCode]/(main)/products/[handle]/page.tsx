import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getStorefrontSettings } from "@lib/data/currency"
import { listLocales } from "@lib/data/locales"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import {
  getPreferredResolvedProductVariantCombination,
  resolveProductVariantCombinations,
} from "@lib/util/variant-combinations"
import {
  buildBreadcrumbStructuredData,
  buildCanonicalUrl,
  buildLanguageAlternates,
  buildLocalizedPath,
  buildProductStructuredData,
  getOpenGraphImage,
  serializeStructuredData,
  getTwitterImage,
} from "@lib/util/seo"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string; preset?: string }>
}

export const dynamic = "force-dynamic"

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
  return product.images!.filter((i) => imageIdsMap.has(i.id))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const [product, locales] = await Promise.all([
    listProducts({
      countryCode: params.countryCode,
      queryParams: { handle },
    }).then(({ response }) => response.products[0]),
    listLocales(),
  ])

  if (!product) {
    notFound()
  }

  const path = buildLocalizedPath(params.countryCode, "products", handle)
  const canonicalUrl = buildCanonicalUrl(path)
  const image = product.thumbnail

  return {
    title: `${product.title} | NEXMART`,
    description: product.description
      ? product.description.slice(0, 160)
      : `Shop ${product.title} at NEXMART \u2014 fast shipping and great deals.`,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(path, locales),
    },
    openGraph: {
      type: "website",
      siteName: "NEXMART",
      title: `${product.title} | NEXMART`,
      description: product.description
        ? product.description.slice(0, 160)
        : `Shop ${product.title} at NEXMART.`,
      url: canonicalUrl,
      images: [getOpenGraphImage(image, product.title)],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | NEXMART`,
      description: product.description
        ? product.description.slice(0, 160)
        : `Shop ${product.title} at NEXMART.`,
      images: [getTwitterImage(image)],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const requestedVariantId = searchParams.v_id
  const requestedPresetKey = searchParams.preset

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])
  const storeSettings = await getStorefrontSettings()

  if (!pricedProduct) {
    notFound()
  }

  const resolvedVariantCombinations = resolveProductVariantCombinations(
    pricedProduct,
    storeSettings.variantCombinationDefaultsByType
  )

  const requestedPresetCombination = requestedPresetKey
    ? resolvedVariantCombinations.find(
        (combination) =>
          combination.key === requestedPresetKey && combination.matchingVariant
      )
    : undefined

  const preferredPresetCombination = getPreferredResolvedProductVariantCombination(
    pricedProduct,
    storeSettings.variantCombinationDefaultsByType
  )

  const requestedVariant = requestedVariantId
    ? pricedProduct.variants?.find((variant) => variant.id === requestedVariantId)
    : undefined

  const selectedVariantId =
    requestedVariant?.id ||
    requestedPresetCombination?.matchingVariant?.id ||
    preferredPresetCombination?.matchingVariant?.id ||
    (pricedProduct.variants?.length === 1 ? pricedProduct.variants[0].id : undefined)

  const selectedPresetKey =
    requestedPresetCombination?.key ||
    resolvedVariantCombinations.find(
      (combination) => combination.matchingVariant?.id === selectedVariantId
    )?.key

  const images = getImagesForVariant(pricedProduct, selectedVariantId)
  const productPath = buildLocalizedPath(params.countryCode, "products", params.handle)
  const canonicalUrl = buildCanonicalUrl(productPath)
  const structuredData = serializeStructuredData([
    buildBreadcrumbStructuredData([
      {
        name: "Home",
        item: buildCanonicalUrl(buildLocalizedPath(params.countryCode)),
      },
      {
        name: "Shop",
        item: buildCanonicalUrl(buildLocalizedPath(params.countryCode, "store")),
      },
      {
        name: pricedProduct.title,
        item: canonicalUrl,
      },
    ]),
    buildProductStructuredData({
      product: pricedProduct,
      url: canonicalUrl,
      image: images?.[0]?.url ?? pricedProduct.thumbnail,
      selectedVariantId,
    }),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images}
        storeSettings={storeSettings}
        selectedVariantId={selectedVariantId}
        selectedPresetKey={selectedPresetKey}
      />
    </>
  )
}
