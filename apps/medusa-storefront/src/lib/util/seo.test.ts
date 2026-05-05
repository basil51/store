import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  buildBreadcrumbStructuredData,
  buildAbsoluteSeoImageUrl,
  buildLanguageAlternates,
  buildCanonicalUrl,
  buildCollectionPageStructuredData,
  buildItemListStructuredData,
  buildLocalizedPath,
  buildOrganizationStructuredData,
  buildProductStructuredData,
  buildWebsiteStructuredData,
  getCategoryPathSegments,
  getCategoryBreadcrumbItems,
  getDefaultOpenGraphImage,
  getDefaultTwitterImage,
  getOpenGraphImage,
  getSeoLocaleCodes,
  getSeoMetadataImage,
  getSitemapCountryCodes,
  getTwitterImage,
  serializeStructuredData,
} from "./seo"

describe("seo helpers", () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://store.example.com/"
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl
  })

  it("builds stable localized canonical paths", () => {
    expect(buildLocalizedPath("IL", "categories", ["computers", "laptops"])).toBe(
      "/il/categories/computers/laptops"
    )
  })

  it("builds absolute canonical URLs from the configured base URL", () => {
    expect(buildCanonicalUrl("/il/store")).toBe("https://store.example.com/il/store")
  })

  it("builds absolute SEO image URLs with stable defaults", () => {
    expect(buildAbsoluteSeoImageUrl("/custom-og.jpg")).toBe(
      "https://store.example.com/custom-og.jpg"
    )
    expect(getDefaultOpenGraphImage("NEXMART Store")).toEqual({
      url: "https://store.example.com/opengraph-image.jpg",
      alt: "NEXMART Store",
      width: 1200,
      height: 630,
    })
    expect(getDefaultTwitterImage()).toBe(
      "https://store.example.com/twitter-image.jpg"
    )
  })

  it("uses provided social images before falling back to defaults", () => {
    expect(getOpenGraphImage("https://cdn.example.com/og.jpg", "Dell")).toEqual({
      url: "https://cdn.example.com/og.jpg",
      alt: "Dell",
      width: 1200,
      height: 630,
    })
    expect(getTwitterImage(null)).toBe("https://store.example.com/twitter-image.jpg")
  })

  it("builds crawlable language alternate URLs with locale query params", () => {
    expect(buildLanguageAlternates("/il/products/dell", [{ code: "ar" }])).toEqual({
      ar: "https://store.example.com/il/products/dell?locale=ar",
      en: "https://store.example.com/il/products/dell?locale=en",
      he: "https://store.example.com/il/products/dell?locale=he",
      "x-default": "https://store.example.com/il/products/dell?locale=en",
    })
  })

  it("normalizes backend locale codes for SEO alternates", () => {
    expect(getSeoLocaleCodes([{ code: "en-US" }, { code: "AR" }])).toEqual([
      "ar",
      "en",
      "he",
    ])
  })

  it("deduplicates and sorts sitemap country codes", () => {
    expect(
      getSitemapCountryCodes([
        { countries: [{ iso_2: "IL" }, { iso_2: "us" }] },
        { countries: [{ iso_2: "il" }, { iso_2: null }] },
      ])
    ).toEqual(["il", "us"])
  })

  it("resolves nested category URL segments from parent chains", () => {
    expect(
      getCategoryPathSegments({
        handle: "laptops",
        parent_category: {
          handle: "computers",
          parent_category: null,
        },
      })
    ).toEqual(["computers", "laptops"])
  })

  it("uses the first configured SEO image metadata key", () => {
    expect(
      getSeoMetadataImage({
        image_url: " https://cdn.example.com/category.jpg ",
        logo: "https://cdn.example.com/logo.svg",
      })
    ).toBe("https://cdn.example.com/category.jpg")
  })

  it("builds breadcrumb structured data from ordered items", () => {
    expect(
      buildBreadcrumbStructuredData([
        {
          name: "Home",
          item: "https://store.example.com/il",
        },
        {
          name: "Shop",
          item: "https://store.example.com/il/store",
        },
      ])
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://store.example.com/il",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Shop",
          item: "https://store.example.com/il/store",
        },
      ],
    })
  })

  it("builds nested category breadcrumb items from parent chains", () => {
    expect(
      getCategoryBreadcrumbItems(
        {
          handle: "laptops",
          name: "Laptops",
          parent_category: {
            handle: "computers",
            name: "Computers",
            parent_category: null,
          },
        },
        "il"
      )
    ).toEqual([
      {
        name: "Home",
        item: "https://store.example.com/il",
      },
      {
        name: "Categories",
        item: "https://store.example.com/il/store",
      },
      {
        name: "Computers",
        item: "https://store.example.com/il/categories/computers",
      },
      {
        name: "Laptops",
        item: "https://store.example.com/il/categories/computers/laptops",
      },
    ])
  })

  it("builds website and organization structured data", () => {
    expect(
      buildWebsiteStructuredData({
        name: "NEXMART",
        url: "https://store.example.com/il",
        description: "Tech store",
      })
    ).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "NEXMART",
      url: "https://store.example.com/il",
      description: "Tech store",
    })

    expect(
      buildOrganizationStructuredData({
        name: "NEXMART",
        url: "https://store.example.com/il",
      })
    ).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "NEXMART",
      url: "https://store.example.com/il",
    })
  })

  it("builds collection-page structured data with absolute image URLs", () => {
    expect(
      buildCollectionPageStructuredData({
        name: "Laptops",
        description: "Portable computers.",
        url: "https://store.example.com/il/categories/laptops",
        image: "/category.jpg",
      })
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Laptops",
      description: "Portable computers.",
      url: "https://store.example.com/il/categories/laptops",
      image: "https://store.example.com/category.jpg",
    })
  })

  it("builds product structured data with offers from the selected variant", () => {
    expect(
      buildProductStructuredData({
        product: {
          title: "Gaming Laptop",
          handle: "gaming-laptop",
          description: "High-end portable gaming machine.",
          variants: [
            {
              id: "variant_1",
              allow_backorder: false,
              manage_inventory: true,
              inventory_quantity: 5,
              calculated_price: {
                calculated_amount: 1499,
                currency_code: "usd",
              },
            },
          ],
          categories: [{ name: "Laptops" }],
        } as any,
        url: "https://store.example.com/il/products/gaming-laptop",
        image: "https://cdn.example.com/gaming-laptop.jpg",
        selectedVariantId: "variant_1",
      })
    ).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Gaming Laptop",
      sku: "gaming-laptop",
      category: "Laptops",
      image: ["https://cdn.example.com/gaming-laptop.jpg"],
      offers: {
        "@type": "Offer",
        price: 1499,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: "https://store.example.com/il/products/gaming-laptop",
      },
    })
  })

  it("adds metadata-driven brand, gtin, aggregate rating, and reviews to product structured data", () => {
    expect(
      buildProductStructuredData({
        product: {
          title: "Studio Monitor",
          handle: "studio-monitor",
          metadata: {
            brand: "NEXMART Audio",
            gtin13: "1234567890123",
            rating_value: "4.6",
            review_count: "18",
            reviews: [
              {
                author: "Basel",
                review_body: "Balanced and clear.",
                rating_value: 5,
                published_at: "2026-05-01",
              },
            ],
          },
          variants: [],
          categories: [],
        } as any,
        url: "https://store.example.com/il/products/studio-monitor",
      })
    ).toMatchObject({
      brand: {
        "@type": "Brand",
        name: "NEXMART Audio",
      },
      gtin13: "1234567890123",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: 4.6,
        reviewCount: 18,
      },
      review: [
        {
          "@type": "Review",
          author: {
            "@type": "Person",
            name: "Basel",
          },
          reviewBody: "Balanced and clear.",
        },
      ],
    })
  })

  it("builds item-list structured data for index pages", () => {
    expect(
      buildItemListStructuredData({
        name: "Collections",
        url: "https://store.example.com/il/collections",
        items: [
          {
            name: "Dell",
            item: "https://store.example.com/il/collections/dell",
          },
          {
            name: "Logitech",
            item: "https://store.example.com/il/collections/logitech",
          },
        ],
      })
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Collections",
      url: "https://store.example.com/il/collections",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Dell",
          url: "https://store.example.com/il/collections/dell",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Logitech",
          url: "https://store.example.com/il/collections/logitech",
        },
      ],
    })
  })

  it("serializes structured data safely for script output", () => {
    expect(
      serializeStructuredData({
        text: "<script>",
      })
    ).toBe('{"text":"\\u003cscript>"}')
  })
})
