import { getLocale } from "@lib/data/locale-actions"
import { getCategoryImageUrl } from "@lib/util/category-metadata"
import { getUiCopy } from "@lib/ui-copy"

type Props = {
  name: string
  metadata?: Record<string, unknown> | null
}

/**
 * Wide banner when the category has `metadata.image` (or `image_url` / `thumbnail`).
 */
export default async function CategoryHeroImage({ name, metadata }: Props) {
  const locale = (await getLocale()) ?? "en"
  const src = getCategoryImageUrl(metadata)
  if (!src) {
    return null
  }

  return (
    <div
      className="relative mb-8 w-full overflow-hidden rounded-[30px] border border-white/70 bg-ui-bg-subtle aspect-[21/9] max-h-[360px] shadow-[0_24px_80px_rgba(8,17,31,0.08)]"
      data-testid="category-hero-image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary MinIO/S3 URLs */}
      <img
        src={src}
        alt=""
        width={1600}
        height={686}
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08111f]/70 via-[#08111f]/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 small:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
          {getUiCopy(locale, "categoryPageSpotlight")}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white small:text-4xl">
          {name}
        </p>
      </div>
      <span className="sr-only">{name}</span>
    </div>
  )
}
