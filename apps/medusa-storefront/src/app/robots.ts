import { MetadataRoute } from "next"

import { getSeoBaseUrl } from "@lib/util/seo"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSeoBaseUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/account",
        "/*/cart",
        "/*/checkout",
        "/*/order",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
