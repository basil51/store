const DEFAULT_STOREFRONT_URL = "http://localhost:8000"

const resolveStorefrontUrl = () => {
  const configured = process.env.STOREFRONT_URL?.trim()

  if (configured) {
    return configured
  }

  const storeCors = process.env.STORE_CORS?.split(",")
    .map((value) => value.trim())
    .find(Boolean)

  return storeCors || DEFAULT_STOREFRONT_URL
}

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

export const revalidateStorefrontCatalog = async (tags?: string[]) => {
  const secret = resolveRevalidateSecret()

  if (!secret) {
    console.warn(
      "Skipping storefront catalog revalidation because STOREFRONT_REVALIDATE_SECRET is not configured."
    )
    return
  }

  const url = new URL("/api/internal/revalidate-catalog", resolveStorefrontUrl())
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(tags?.length ? { tags } : {}),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Storefront catalog revalidation failed: ${response.status} ${response.statusText} - ${body}`
    )
  }
}