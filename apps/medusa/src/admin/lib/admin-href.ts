/**
 * Build an absolute admin path (e.g. `/app/orders/ord_123`) from a path relative to the
 * Medusa admin app root (`/app`, …). Drops the current route segment so it works from any
 * custom UI route like `/app/store-overview`.
 */
export function adminHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`

  if (typeof window === "undefined") {
    return normalized
  }

  const segments = window.location.pathname.split("/").filter(Boolean)
  segments.pop()
  const root = segments.length ? `/${segments.join("/")}` : ""

  return `${root}${normalized}`
}
