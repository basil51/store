import { normalizeCatalogCacheTags } from "@lib/data/catalog-cache"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const resolveRevalidateSecret = () => {
  const configured = process.env.STOREFRONT_REVALIDATE_SECRET?.trim()

  if (configured) {
    return configured
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-storefront-revalidate-secret"
  }

  return null
}

export async function POST(request: NextRequest) {
  const expectedSecret = resolveRevalidateSecret()

  if (!expectedSecret) {
    return NextResponse.json(
      { message: "Storefront revalidation secret is not configured." },
      { status: 503 }
    )
  }

  if (request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
  }

  const body = await request
    .json()
    .catch(() => ({}) as { tags?: string[] | undefined })
  const tags = normalizeCatalogCacheTags(
    Array.isArray(body?.tags) ? body.tags : undefined
  )

  for (const tag of tags) {
    revalidateTag(tag)
  }

  return NextResponse.json({ revalidated: tags })
}