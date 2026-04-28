/**
 * Category images from Admin → Product category → Metadata.
 * Supported keys (first non-empty string wins): `image`, `image_url`, `thumbnail`.
 */
export function getCategoryImageUrl(
  metadata?: Record<string, unknown> | null
): string | null {
  if (!metadata) {
    return null
  }
  for (const key of ["image", "image_url", "thumbnail"] as const) {
    const v = metadata[key]
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim()
    }
  }
  return null
}
